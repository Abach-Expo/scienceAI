/**
 * 🍋 LEMONSQUEEZY SERVICE
 * Единственный платёжный провайдер для Science AI
 * 
 * Документация: https://docs.lemonsqueezy.com/api
 */

import {
  lemonSqueezySetup,
  createCheckout,
  getSubscription,
  cancelSubscription as lsCancelSubscription,
  updateSubscription,
  listSubscriptions,
  getCustomer,
} from '@lemonsqueezy/lemonsqueezy.js';
import { logger } from '../utils/logger';

// ================== ИНИЦИАЛИЗАЦИЯ ==================

const LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY || '';
const LEMONSQUEEZY_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID || '';
const LEMONSQUEEZY_WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '';

// Variant IDs для каждого плана (создаются в LemonSqueezy Dashboard)
export const LS_VARIANT_IDS = {
  starter_monthly: process.env.LS_VARIANT_STARTER_MONTHLY || '',
  starter_annual: process.env.LS_VARIANT_STARTER_ANNUAL || '',
  pro_monthly: process.env.LS_VARIANT_PRO_MONTHLY || '',
  pro_annual: process.env.LS_VARIANT_PRO_ANNUAL || '',
  premium_monthly: process.env.LS_VARIANT_PREMIUM_MONTHLY || '',
  premium_annual: process.env.LS_VARIANT_PREMIUM_ANNUAL || '',
};

// Маппинг обратно: variantId → planId
const VARIANT_TO_PLAN: Record<string, { planId: string; period: string }> = {};
Object.entries(LS_VARIANT_IDS).forEach(([key, variantId]) => {
  if (variantId) {
    const [planId, period] = key.split('_');
    VARIANT_TO_PLAN[variantId] = { planId, period };
  }
});

// Инициализация SDK
let isInitialized = false;

function initLemonSqueezy() {
  if (isInitialized) return;
  
  if (!LEMONSQUEEZY_API_KEY) {
    logger.warn('LemonSqueezy API key not configured');
    return;
  }
  
  lemonSqueezySetup({ apiKey: LEMONSQUEEZY_API_KEY });
  isInitialized = true;
  logger.info('LemonSqueezy SDK initialized');
}

// ================== CHECKOUT ==================

export interface CreateCheckoutParams {
  planId: string;
  billingPeriod: 'monthly' | 'annual';
  userEmail: string;
  userId: string;
  userName?: string;
  successUrl?: string;
  cancelUrl?: string;
}

/**
 * Создание Checkout Session через LemonSqueezy API
 * Возвращает URL для перенаправления клиента
 */
export async function createLSCheckout(params: CreateCheckoutParams): Promise<{ url: string; checkoutId: string }> {
  initLemonSqueezy();
  
  const { planId, billingPeriod, userEmail, userId, userName, successUrl, cancelUrl } = params;
  
  // Получаем Variant ID
  const variantKey = `${planId}_${billingPeriod}` as keyof typeof LS_VARIANT_IDS;
  const variantId = LS_VARIANT_IDS[variantKey];
  
  if (!variantId) {
    throw new Error(`No LemonSqueezy variant configured for ${planId}/${billingPeriod}`);
  }
  
  if (!LEMONSQUEEZY_STORE_ID) {
    throw new Error('LemonSqueezy store ID not configured');
  }
  
  const { data, error } = await createCheckout(LEMONSQUEEZY_STORE_ID, variantId, {
    checkoutData: {
      email: userEmail,
      name: userName || undefined,
      custom: {
        user_id: userId,
        plan_id: planId,
        billing_period: billingPeriod,
      },
    },
    checkoutOptions: {
      embed: false,
      media: true,
      logo: true,
      desc: true,
      discount: true,
      dark: true,
      subscriptionPreview: true,
      buttonColor: '#8B5CF6',
    },
    productOptions: {
      enabledVariants: [parseInt(variantId)],
      redirectUrl: successUrl || `${process.env.FRONTEND_URL || 'https://science-ai.app'}/settings?payment=success`,
      receiptButtonText: 'Вернуться в Science AI',
      receiptThankYouNote: 'Спасибо за подписку! Ваш план активирован.',
    },
  });
  
  if (error) {
    logger.error('LemonSqueezy checkout error:', error);
    throw new Error(`Failed to create checkout: ${JSON.stringify(error)}`);
  }
  
  const checkoutUrl = data?.data?.attributes?.url;
  const checkoutId = data?.data?.id;
  
  if (!checkoutUrl) {
    throw new Error('No checkout URL returned from LemonSqueezy');
  }
  
  logger.info(`LemonSqueezy checkout created: ${checkoutId} for user ${userId}, plan ${planId}/${billingPeriod}`);
  
  return { url: checkoutUrl, checkoutId: checkoutId || '' };
}

// ================== ПОДПИСКИ ==================

/**
 * Получить данные подписки по ID
 */
export async function getLSSubscription(subscriptionId: string) {
  initLemonSqueezy();
  
  const { data, error } = await getSubscription(subscriptionId);
  
  if (error) {
    logger.error(`Failed to get subscription ${subscriptionId}:`, error);
    throw new Error(`Failed to get subscription: ${JSON.stringify(error)}`);
  }
  
  return data?.data;
}

/**
 * Отменить подписку (в конце периода)
 */
export async function cancelLSSubscription(subscriptionId: string) {
  initLemonSqueezy();
  
  const { data, error } = await lsCancelSubscription(subscriptionId);
  
  if (error) {
    logger.error(`Failed to cancel subscription ${subscriptionId}:`, error);
    throw new Error(`Failed to cancel subscription: ${JSON.stringify(error)}`);
  }
  
  logger.info(`Subscription ${subscriptionId} cancelled`);
  return data?.data;
}

/**
 * Возобновить подписку (если отменена, но ещё не истекла)
 */
export async function resumeLSSubscription(subscriptionId: string) {
  initLemonSqueezy();
  
  const { data, error } = await updateSubscription(subscriptionId, {
    cancelled: false,
  });
  
  if (error) {
    logger.error(`Failed to resume subscription ${subscriptionId}:`, error);
    throw new Error(`Failed to resume subscription: ${JSON.stringify(error)}`);
  }
  
  logger.info(`Subscription ${subscriptionId} resumed`);
  return data?.data;
}

/**
 * Сменить план (upgrade/downgrade)
 */
export async function changeLSPlan(subscriptionId: string, newPlanId: string, newPeriod: string) {
  initLemonSqueezy();
  
  const variantKey = `${newPlanId}_${newPeriod}` as keyof typeof LS_VARIANT_IDS;
  const newVariantId = LS_VARIANT_IDS[variantKey];
  
  if (!newVariantId) {
    throw new Error(`No variant for plan ${newPlanId}/${newPeriod}`);
  }
  
  const { data, error } = await updateSubscription(subscriptionId, {
    variantId: parseInt(newVariantId),
  });
  
  if (error) {
    logger.error(`Failed to change plan for ${subscriptionId}:`, error);
    throw new Error(`Failed to change plan: ${JSON.stringify(error)}`);
  }
  
  logger.info(`Subscription ${subscriptionId} changed to ${newPlanId}/${newPeriod}`);
  return data?.data;
}

// ================== WEBHOOK ВАЛИДАЦИЯ ==================

import crypto from 'crypto';

/**
 * Проверка подписи вебхука LemonSqueezy
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!LEMONSQUEEZY_WEBHOOK_SECRET) {
    logger.warn('Webhook secret not configured, skipping verification');
    return false;
  }
  
  const hmac = crypto.createHmac('sha256', LEMONSQUEEZY_WEBHOOK_SECRET);
  const digest = hmac.update(rawBody).digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

/**
 * Получить planId из webhook event (через variant_id или custom data)
 */
export function getPlanFromWebhook(eventData: { meta?: { custom_data?: Record<string, string> }; data?: { attributes?: Record<string, unknown> & { variant_id?: string; first_subscription_item?: { variant_id?: string } } }; [key: string]: unknown }): { planId: string; period: string } | null {
  // Сначала пробуем custom data
  const customData = eventData?.meta?.custom_data;
  if (customData?.plan_id) {
    return { 
      planId: customData.plan_id, 
      period: customData.billing_period || 'monthly' 
    };
  }
  
  // Иначе по variant_id
  const variantId = String(eventData?.data?.attributes?.variant_id || eventData?.data?.attributes?.first_subscription_item?.variant_id || '');
  if (variantId && VARIANT_TO_PLAN[variantId]) {
    return VARIANT_TO_PLAN[variantId];
  }
  
  return null;
}

// ================== ЭКСПОРТ ==================

export {
  LEMONSQUEEZY_API_KEY,
  LEMONSQUEEZY_STORE_ID,
  LEMONSQUEEZY_WEBHOOK_SECRET,
  VARIANT_TO_PLAN,
  initLemonSqueezy,
};
