/**
 * 🎫 USAGE LIMIT MIDDLEWARE
 * Проверка лимитов AI-генераций по подписке
 */

import { Response, NextFunction } from 'express';
import { prisma } from '../index';
import { logger } from '../utils/logger';
import { AuthRequest } from './auth.middleware';

// ================== ТИПЫ ==================

type SubscriptionPlan = 'free' | 'starter' | 'pro' | 'premium';

// ================== ПЛАН ЛИМИТОВ ==================

export const SUBSCRIPTION_LIMITS = {
  free: {
    name: 'Free',
    aiGenerations: 50,
    tokensLimit: 25000,
    gpt4oTokensLimit: 0,
    maxTokensPerRequest: 4000,
    models: ['gpt-4o-mini'] as const,
    features: ['basic'],
    periodDays: 30,
  },
  starter: {
    name: 'Starter',
    aiGenerations: 300,
    tokensLimit: 150000,
    gpt4oTokensLimit: 30000,
    maxTokensPerRequest: 8000,
    models: ['gpt-4o-mini', 'gpt-4o'] as const,
    features: ['basic', 'export'],
    periodDays: 30,
  },
  pro: {
    name: 'Professional',
    aiGenerations: 500,
    tokensLimit: 200000,
    gpt4oTokensLimit: 100000,
    maxTokensPerRequest: 16000,
    models: ['gpt-4o-mini', 'gpt-4o'] as const,
    features: ['all'],
    periodDays: 30,
  },
  premium: {
    name: 'Pro+',
    aiGenerations: 2000,
    tokensLimit: 1000000,
    gpt4oTokensLimit: 500000,
    maxTokensPerRequest: 16000,
    models: ['gpt-4o-mini', 'gpt-4o'] as const,
    features: ['all'],
    periodDays: 30,
  },
} as const;

// ================== ИНТЕРФЕЙСЫ ==================

export interface UsageLimitsInfo {
  plan: SubscriptionPlan;
  generationsUsed: number;
  generationsLimit: number;
  generationsRemaining: number;
  tokensUsed: number;
  tokensLimit: number;
  tokensRemaining: number;
  gpt4oTokensUsed: number;
  gpt4oTokensLimit: number;
  gpt4oTokensRemaining: number;
  maxTokensPerRequest: number;
  allowedModels: readonly string[];
  currentModel: string;
}

export interface AuthRequestWithUsage extends AuthRequest {
  usageLimits?: UsageLimitsInfo;
}

export interface UsageInfo {
  plan: SubscriptionPlan;
  planName: string;
  generationsUsed: number;
  generationsLimit: number;
  generationsRemaining: number;
  tokensUsed: number;
  tokensLimit: number;
  tokensRemaining: number;
  percentUsed: number;
  periodEndsAt: Date | null;
  canGenerate: boolean;
  upgradeRequired: boolean;
}

// ================== MIDDLEWARE ==================

/**
 * Middleware для проверки лимитов перед AI-генерацией
 */
export async function checkUsageLimits(req: AuthRequestWithUsage, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Проверяем статус подписки
    if (user.subscriptionStatus === 'expired' || user.subscriptionStatus === 'cancelled') {
      // Откатываем на бесплатный план
      await resetToFreePlan(userId);
    }

    // Проверяем, нужно ли сбросить счётчики (новый период)
    const planKey = (user.subscriptionPlan || 'free') as SubscriptionPlan;
    const planLimits = SUBSCRIPTION_LIMITS[planKey] || SUBSCRIPTION_LIMITS.free;
    
    const periodStart = user.currentPeriodStart || new Date();
    const periodDays = planLimits.periodDays;
    const periodEnd = new Date(periodStart.getTime() + periodDays * 24 * 60 * 60 * 1000);
    
    // Если период истёк — сбрасываем счётчики
    if (new Date() > periodEnd) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          aiGenerationsUsed: 0,
          tokensUsed: 0,
          gpt4oTokensUsed: 0,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000),
        },
      });
      
      // Обновляем локальные данные
      user.aiGenerationsUsed = 0;
      user.tokensUsed = 0;
      user.gpt4oTokensUsed = 0;
    }

    // Проверяем лимит генераций
    // Всегда используем лимиты из плана (SUBSCRIPTION_LIMITS), а не из БД,
    // чтобы обновления лимитов применялись ко всем пользователям мгновенно
    const generationsLimit = planLimits.aiGenerations;
    const generationsUsed = user.aiGenerationsUsed || 0;
    
    if (generationsUsed >= generationsLimit) {
      return res.status(429).json({
        error: 'Лимит генераций исчерпан',
        code: 'GENERATION_LIMIT_EXCEEDED',
        usage: {
          plan: planKey,
          generationsUsed,
          generationsLimit,
          tokensUsed: user.tokensUsed,
          tokensLimit: user.tokensLimit,
        },
        message: `Вы использовали ${generationsUsed}/${generationsLimit} генераций. Обновите план для продолжения.`,
        upgradeUrl: '/settings?tab=subscription',
      });
    }

    // Проверяем лимит токенов
    const tokensLimit = planLimits.tokensLimit;
    const tokensUsed = user.tokensUsed || 0;
    
    if (tokensUsed >= tokensLimit) {
      return res.status(429).json({
        error: 'Лимит токенов исчерпан',
        code: 'TOKEN_LIMIT_EXCEEDED',
        usage: {
          plan: planKey,
          generationsUsed,
          generationsLimit,
          tokensUsed,
          tokensLimit,
        },
        message: `Вы использовали ${tokensUsed.toLocaleString()}/${tokensLimit.toLocaleString()} токенов.`,
        upgradeUrl: '/settings?tab=subscription',
      });
    }

    // Проверяем лимит GPT-4o токенов
    const gpt4oTokensUsed = user.gpt4oTokensUsed || 0;
    const gpt4oTokensLimit = planLimits.gpt4oTokensLimit;
    
    // Получаем модель из запроса (если есть)
    // Бэкенд сам выбирает оптимальную модель через AIService routing,
    // поэтому НЕ блокируем по модели из запроса — просто даунгрейдим
    const requestedModel = req.body?.model || 'gpt-4o-mini';
    const allowedModels = planLimits.models as readonly string[];
    
    // Автоматически подбираем доступную модель вместо блокировки
    let effectiveModel = requestedModel;
    if (!allowedModels.includes(requestedModel)) {
      // Даунгрейдим до разрешённой модели вместо ошибки
      effectiveModel = allowedModels.includes('gpt-4o-mini') 
        ? 'gpt-4o-mini' 
        : (allowedModels[0] as string) || 'gpt-4o-mini';
      // Обновляем модель в теле запроса для дальнейшей обработки
      if (req.body) {
        req.body.model = effectiveModel;
      }
      logger.debug(`Model downgraded: ${requestedModel} → ${effectiveModel} (plan: ${planKey})`);
    }
    
    // Если запрошена GPT-4o — проверяем лимит GPT-4o токенов
    if (effectiveModel === 'gpt-4o' && gpt4oTokensUsed >= gpt4oTokensLimit) {
      // Не блокируем — просто даунгрейдим до gpt-4o-mini
      effectiveModel = 'gpt-4o-mini';
      if (req.body) {
        req.body.model = effectiveModel;
      }
      logger.debug(`GPT-4o token limit reached, downgraded to gpt-4o-mini`);
    }

    // Добавляем информацию о лимитах в request
    req.usageLimits = {
      plan: planKey,
      generationsUsed,
      generationsLimit,
      generationsRemaining: generationsLimit - generationsUsed,
      tokensUsed,
      tokensLimit,
      tokensRemaining: tokensLimit - tokensUsed,
      gpt4oTokensUsed,
      gpt4oTokensLimit,
      gpt4oTokensRemaining: gpt4oTokensLimit - gpt4oTokensUsed,
      maxTokensPerRequest: planLimits.maxTokensPerRequest,
      allowedModels: planLimits.models,
      currentModel: effectiveModel,
    };

    next();
  } catch (error) {
    logger.error('❌ Usage limit check error:', error);
    next(error);
  }
}

/**
 * 🔒 Валидация модели и токенов перед запросом
 */
export function validateModelAccess(
  requestedModel: string,
  requestedTokens: number,
  usageLimits: { allowedModels: string[]; maxTokensPerRequest: number; gpt4oTokensLimit: number; [key: string]: unknown }
): { valid: boolean; error?: string; suggestedModel?: string } {
  const { allowedModels, maxTokensPerRequest, gpt4oTokensLimit } = usageLimits;

  // 1. Проверяем доступ к модели
  if (!allowedModels.includes(requestedModel)) {
    // Предлагаем лучшую доступную модель
    const suggestedModel = allowedModels.includes('gpt-4o-mini') 
      ? 'gpt-4o-mini' 
      : 'gpt-3.5-turbo';
    
    return {
      valid: false,
      error: `Модель ${requestedModel} недоступна на вашем плане. Доступные: ${allowedModels.join(', ')}`,
      suggestedModel,
    };
  }

  // 2. Проверяем лимит токенов на запрос
  if (requestedTokens > maxTokensPerRequest) {
    return {
      valid: false,
      error: `Превышен лимит токенов на запрос: ${requestedTokens} > ${maxTokensPerRequest}`,
    };
  }

  // 3. Проверяем лимит GPT-4o (если запрошена эта модель)
  if (requestedModel === 'gpt-4o' && gpt4oTokensLimit === 0) {
    return {
      valid: false,
      error: 'GPT-4o недоступен на вашем плане. Обновите до Pro.',
      suggestedModel: 'gpt-4o-mini',
    };
  }

  return { valid: true };
}

/**
 * Записывает использование после успешной генерации
 */
export async function recordUsage(
  userId: string,
  tokensUsed: number,
  action: string,
  details?: Record<string, unknown>,
  model?: string
) {
  try {
    const updateData: Record<string, unknown> = {
      aiGenerationsUsed: { increment: 1 },
      tokensUsed: { increment: tokensUsed },
      apiCallsCount: { increment: 1 },
      lastActiveAt: new Date(),
    };

    // Отдельно считаем GPT-4o токены
    if (model === 'gpt-4o') {
      updateData.gpt4oTokensUsed = { increment: tokensUsed };
    }

    await prisma.$transaction([
      // Увеличиваем счётчики
      prisma.user.update({
        where: { id: userId },
        data: updateData,
      }),
      // Логируем
      prisma.usageLog.create({
        data: {
          userId,
          action,
          tokensUsed,
          details: details ? JSON.stringify({ ...details, model }) : JSON.stringify({ model }),
        },
      }),
    ]);
  } catch (error) {
    logger.error('❌ Record usage error:', error);
  }
}

/**
 * Получает информацию об использовании
 */
export async function getUsageInfo(userId: string): Promise<UsageInfo> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const plan = (user.subscriptionPlan || 'free') as SubscriptionPlan;
  const planInfo = SUBSCRIPTION_LIMITS[plan] || SUBSCRIPTION_LIMITS.free;
  
  const generationsUsed = user.aiGenerationsUsed || 0;
  const generationsLimit = planInfo.aiGenerations;
  const tokensUsed = user.tokensUsed || 0;
  const tokensLimit = planInfo.tokensLimit;

  return {
    plan,
    planName: planInfo.name,
    generationsUsed,
    generationsLimit,
    generationsRemaining: Math.max(0, generationsLimit - generationsUsed),
    tokensUsed,
    tokensLimit,
    tokensRemaining: Math.max(0, tokensLimit - tokensUsed),
    percentUsed: Math.round((generationsUsed / generationsLimit) * 100),
    periodEndsAt: user.currentPeriodEnd,
    canGenerate: generationsUsed < generationsLimit && tokensUsed < tokensLimit,
    upgradeRequired: generationsUsed >= generationsLimit || tokensUsed >= tokensLimit,
  };
}

/**
 * Активирует подписку
 */
export async function activateSubscription(
  userId: string,
  plan: SubscriptionPlan,
  lemonSqueezySubscriptionId?: string,
) {
  const planLimits = SUBSCRIPTION_LIMITS[plan];
  const periodDays = planLimits.periodDays;
  const now = new Date();
  
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionPlan: plan,
      subscriptionStatus: 'active',
      subscriptionExpiry: new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000),
      lemonSqueezySubscriptionId,
      aiGenerationsUsed: 0,
      aiGenerationsLimit: planLimits.aiGenerations,
      tokensUsed: 0,
      tokensLimit: planLimits.tokensLimit,
      gpt4oTokensUsed: 0,
      gpt4oTokensLimit: planLimits.gpt4oTokensLimit,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000),
    },
  });
}

/**
 * Resets to free plan when subscription expires
 */
async function resetToFreePlan(userId: string) {
  const freeLimits = SUBSCRIPTION_LIMITS.free;
  
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionPlan: 'free',
      subscriptionStatus: 'active',
      aiGenerationsLimit: freeLimits.aiGenerations,
      tokensLimit: freeLimits.tokensLimit,
      gpt4oTokensLimit: freeLimits.gpt4oTokensLimit,
    },
  });
}

// ================== ЭКСПОРТ ==================

export default {
  checkUsageLimits,
  recordUsage,
  validateModelAccess,
  getUsageInfo,
  activateSubscription,
  SUBSCRIPTION_LIMITS,
};
