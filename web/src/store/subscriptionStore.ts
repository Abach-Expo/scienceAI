import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API_URL } from '../config';
import { useAuthStore } from './authStore';

// Debounce timer for sync
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// Типы подписок
export type PlanType = 'free' | 'starter' | 'pro' | 'premium';

// ================== РЕАЛЬНЫЕ ЗАТРАТЫ НА API ==================
// Claude Sonnet 4: Input $3/1M, Output $15/1M tokens
// GPT-4o: Input $2.5/1M, Output $10/1M tokens
// GPT-4o-mini: Input $0.15/1M, Output $0.6/1M tokens
// Формула: 60% API, 40% маржа
export const API_COSTS = {
  // Claude Sonnet 4 — тексты
  text_model_input_per_1k: 0.003,
  text_model_output_per_1k: 0.015,
  // GPT-4o — анализ
  analysis_model_input_per_1k: 0.0025,
  analysis_model_output_per_1k: 0.01,
  // GPT-4o-mini — чат
  chat_model_input_per_1k: 0.00015,
  chat_model_output_per_1k: 0.0006,
  // Изображения и аудио
  dalle3_per_image: 0.04,
  dalle3_hd_per_image: 0.08,
  whisper_per_minute: 0.006,
  
  // Средние затраты на действие (реальные, input + output)
  essay_generation: 0.036,          // ~5 стр, Claude
  referat_generation: 0.105,        // ~15 стр, Claude
  coursework_generation: 0.21,      // ~30 стр, Claude
  dissertation_section: 0.053,      // ~5 стр, Claude
  dissertation_chapter: 0.35,       // ~20 стр, Claude
  full_dissertation_150p: 1.50,     // ~150 стр, Claude (разбито на главы)
  full_dissertation_300p: 3.00,     // ~300 стр, Claude (батчами по 3 главы)
  academic_work: 0.036,
  // GPT-4o задачи
  presentation_generation: 0.02,
  slide_ai_edit: 0.005,
  document_analysis: 0.015,
  // Быстрые задачи
  chat_message: 0.0004,
  plagiarism_check: 0.005,
  image_analysis: 0.01,
} as const;

// ================== ЛИМИТЫ ПО ПОДПИСКАМ ==================
// ⚠️ SINGLE SOURCE OF TRUTH: These limits MUST match PricingPage.tsx and backend subscription.routes.ts
export const PLAN_LIMITS = {
  free: {
    essaysPerMonth: 3,
    referatsPerMonth: 1,
    courseworksPerMonth: 0,
    
    analysisPerMonth: 5,
    presentationsPerMonth: 2,
    slidesPerPresentation: 15,
    dalleImages: 0,
    
    chatMessagesPerDay: 10,
    plagiarismChecks: 0,
    
    antiAIDetection: false,
    prioritySupport: false,
    
    dissertationGenerations: 0,
    largeChapterGenerations: 0,
    fullDissertationGeneration: false,
    maxDissertationPages: 0,
    
    exportFormats: ['pdf'] as string[],
    maxEstimatedCost: 5,
  },
  starter: {
    essaysPerMonth: 15,
    referatsPerMonth: 5,
    courseworksPerMonth: 2,
    
    analysisPerMonth: 20,
    presentationsPerMonth: 15,
    slidesPerPresentation: 30,
    dalleImages: 3,
    
    chatMessagesPerDay: 50,
    plagiarismChecks: 0,
    
    antiAIDetection: false,
    prioritySupport: false,
    
    dissertationGenerations: 10,
    largeChapterGenerations: 3,
    fullDissertationGeneration: false,
    maxDissertationPages: 0,
    
    exportFormats: ['pdf', 'pptx', 'docx'] as string[],
    maxEstimatedCost: 20,
  },
  pro: {
    essaysPerMonth: 30,
    referatsPerMonth: 12,
    courseworksPerMonth: 5,
    
    analysisPerMonth: 50,
    presentationsPerMonth: 30,
    slidesPerPresentation: 60,
    dalleImages: 10,
    
    chatMessagesPerDay: -1,
    plagiarismChecks: 10,
    
    antiAIDetection: true,
    prioritySupport: true,
    
    dissertationGenerations: 40,
    largeChapterGenerations: 15,
    fullDissertationGeneration: true,
    maxDissertationPages: 150,
    
    exportFormats: ['pdf', 'pptx', 'docx'] as string[],
    maxEstimatedCost: 80,
  },
  premium: {
    essaysPerMonth: 60,
    referatsPerMonth: 25,
    courseworksPerMonth: 10,
    
    analysisPerMonth: 100,
    presentationsPerMonth: 60,
    slidesPerPresentation: 100,
    dalleImages: 25,
    
    chatMessagesPerDay: -1,
    plagiarismChecks: 30,
    
    antiAIDetection: true,
    prioritySupport: true,
    
    dissertationGenerations: 100,
    largeChapterGenerations: 40,
    fullDissertationGeneration: true,
    maxDissertationPages: 300,
    
    exportFormats: ['pdf', 'pptx', 'docx'] as string[],
    maxEstimatedCost: 200,
  },
} as const;

// Стоимость действий в токенах (для внутреннего учёта)
export const TOKEN_COSTS = {
  // Презентации
  presentation: 100,
  presentation_dalle: 300,
  edit_slide: 20,
  
  // Диссертации  
  dissertation_section: 50,
  dissertation_chapter: 500,       // Генерация главы (20+ стр)
  dissertation_full: 2000,         // Полная диссертация
  
  // Академические работы
  academic_work: 80,               // Создание работы (эссе, реферат и т.д.)
  academic_generation: 40,         // Одна генерация раздела
  
  // Общее
  chat_message: 10,
  analysis: 30,
  plagiarism_check: 50,
  image_analysis: 40,
} as const;

// ================== РЕФЕРАЛЬНАЯ СИСТЕМА ==================
export const REFERRAL_BONUSES = {
  referrerBonus: 500,              // Токены тому, кто пригласил
  refereeBonus: 300,               // Токены приглашённому
  referrerExtraLimits: {           // Бонусные лимиты пригласителю
    presentations: 2,
    dalleImages: 2,
    academicWorks: 1,
  },
  maxReferrals: 20,                // Максимум рефералов
} as const;

// ================== ПРОБНЫЙ ПЕРИОД ==================
export const TRIAL_CONFIG = {
  durationDays: 7,                 // 7-дневный пробный период
  plan: 'pro' as PlanType,         // Уровень Pro на время триала
  requiresCard: false,             // Не требует карту
  features: [
    'Все возможности Pro на 7 дней',
    '25 эссе',
    '35 анализов',
    '20 презентаций',
    'Безлимит чат',
    'Anti-AI Detection v3',
  ],
  featuresEn: [
    'All Pro features for 7 days',
    '25 essays',
    '35 analyses',
    '20 presentations',
    'Unlimited chat',
    'Anti-AI Detection v3',
  ],
} as const;

// Планы подписок (display data, synced with PLAN_LIMITS)
export const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Бесплатный',
    nameEn: 'Free',
    price: 0,
    tokens: 1000,
    features: [
      '3 эссе + 1 реферат/мес',
      '5 AI-анализов',
      '2 презентации/мес',
      '10 сообщений/день',
      'Экспорт PDF',
    ],
    featuresEn: [
      '3 essays + 1 term paper/mo',
      '5 AI analyses',
      '2 presentations/mo',
      '10 messages/day',
      'PDF export',
    ],
    isUnlimited: false,
    color: 'gray',
    popular: false,
  },
  starter: {
    id: 'starter',
    name: 'Стартер',
    nameEn: 'Starter',
    price: 5.99,
    tokens: 2000,
    features: [
      '15 эссе + 5 рефератов + 2 курсовых/мес',
      '20 AI-анализов',
      '15 презентаций/мес',
      '10 генераций диссертаций',
      '3 AI-изображения',
      '50 сообщений/день',
      'Экспорт PDF/PPTX/DOCX',
    ],
    featuresEn: [
      '15 essays + 5 term papers + 2 courseworks/mo',
      '20 AI analyses',
      '15 presentations/mo',
      '10 dissertation generations',
      '3 AI images',
      '50 messages/day',
      'PDF/PPTX/DOCX export',
    ],
    isUnlimited: false,
    color: 'blue',
    popular: false,
  },
  pro: {
    id: 'pro',
    name: 'Про',
    nameEn: 'Pro',
    price: 12.99,
    tokens: 5000,
    features: [
      '30 эссе + 12 рефератов + 5 курсовых/мес',
      '50 AI-анализов',
      '30 презентаций/мес',
      '40 генераций диссертаций',
      'Полная диссертация до 150 стр.',
      '10 AI-изображений',
      'Безлимит чат',
      'Anti-AI Detection',
      'Проверка на плагиат',
      'Приоритетная поддержка',
    ],
    featuresEn: [
      '30 essays + 12 term papers + 5 courseworks/mo',
      '50 AI analyses',
      '30 presentations/mo',
      '40 dissertation generations',
      'Full dissertation up to 150 pages',
      '10 AI images',
      'Unlimited chat',
      'Anti-AI Detection',
      'Plagiarism check',
      'Priority support',
    ],
    isUnlimited: false,
    color: 'purple',
    popular: true,
  },
  premium: {
    id: 'premium',
    name: 'Pro+',
    nameEn: 'Pro+',
    price: 24.99,
    tokens: 15000,
    features: [
      '60 эссе + 25 рефератов + 10 курсовых/мес',
      '100 AI-анализов',
      '60 презентаций/мес',
      '100 генераций диссертаций',
      '3 полных диссертации до 300 стр.',
      '25 AI-изображений',
      'Безлимит чат',
      'Anti-AI Detection v3',
      'Проверка на плагиат',
      'Приоритетная поддержка',
    ],
    featuresEn: [
      '60 essays + 25 term papers + 10 courseworks/mo',
      '100 AI analyses',
      '60 presentations/mo',
      '100 dissertation generations',
      '3 full dissertations up to 300 pages',
      '25 AI images',
      'Unlimited chat',
      'Anti-AI Detection v3',
      'Plagiarism check',
      'Priority support',
    ],
    isUnlimited: false,
    color: 'amber',
    popular: false,
  },
} as const;

// ================== ГОДОВЫЕ ПЛАНЫ (скидка 20%) ==================
export const ANNUAL_PLANS = {
  starter_annual: {
    id: 'starter_annual',
    name: 'Стартер (Год)',
    nameEn: 'Starter (Annual)',
    monthlyPrice: 5.99,
    annualPrice: 57.50,
    savings: 14.38,
    tokensPerMonth: 2000,
    limits: {
      essaysPerYear: 180,            // 15 × 12
      referatsPerYear: 60,           // 5 × 12
      courseworksPerYear: 24,        // 2 × 12
      analysisPerYear: 240,          // 20 × 12
      presentationsPerYear: 180,     // 15 × 12
      dalleImages: 36,               // 3 × 12
    },
    features: [
      '180 эссе/год',
      '60 рефератов/год',
      '24 курсовых/год',
      '180 презентаций/год',
      '36 AI-изображений',
      'Экономия $14.38/год',
    ],
    featuresEn: [
      '180 essays/year',
      '60 term papers/year',
      '24 courseworks/year',
      '180 presentations/year',
      '36 AI images',
      'Save $14.38/year',
    ],
  },
  pro_annual: {
    id: 'pro_annual',
    name: 'Про (Год)',
    nameEn: 'Pro (Annual)',
    monthlyPrice: 12.99,
    annualPrice: 124.70,
    savings: 31.18,
    tokensPerMonth: 5000,
    limits: {
      essaysPerYear: 360,            // 30 × 12
      referatsPerYear: 144,          // 12 × 12
      courseworksPerYear: 60,        // 5 × 12
      analysisPerYear: 600,          // 50 × 12
      presentationsPerYear: 360,     // 30 × 12
      dalleImages: 120,              // 10 × 12
    },
    features: [
      '360 эссе/год',
      '144 рефератов/год',
      '60 курсовых/год',
      '360 презентаций/год',
      '120 AI-изображений',
      'Экономия $31.18/год',
    ],
    featuresEn: [
      '360 essays/year',
      '144 term papers/year',
      '60 courseworks/year',
      '360 presentations/year',
      '120 AI images',
      'Save $31.18/year',
    ],
    popular: true,
  },
  premium_annual: {
    id: 'premium_annual',
    name: 'Pro+ (Год)',
    nameEn: 'Pro+ (Annual)',
    monthlyPrice: 24.99,
    annualPrice: 239.90,
    savings: 59.98,
    tokensPerMonth: 15000,
    limits: {
      essaysPerYear: 720,            // 60 × 12
      referatsPerYear: 300,          // 25 × 12
      courseworksPerYear: 120,       // 10 × 12
      analysisPerYear: 1200,         // 100 × 12
      presentationsPerYear: 720,     // 60 × 12
      dalleImages: 300,              // 25 × 12
    },
    features: [
      '720 эссе/год',
      '300 рефератов/год',
      '120 курсовых/год',
      '720 презентаций/год',
      '300 AI-изображений',
      'Экономия $59.98/год',
    ],
    featuresEn: [
      '720 essays/year',
      '300 term papers/year',
      '120 courseworks/year',
      '720 presentations/year',
      '300 AI images',
      'Save $59.98/year',
    ],
    popular: false,
  },
} as const;

// Пакеты токенов для покупки
export const TOKEN_PACKAGES = [
  {
    id: 'pack_small',
    name: 'Мини',
    nameEn: 'Mini',
    tokens: 500,
    price: 1.99,
    bonus: 0,
    description: '~5 презентаций',
  },
  {
    id: 'pack_medium',
    name: 'Стандарт',
    nameEn: 'Standard',
    tokens: 2000,
    price: 4.99,
    bonus: 200,
    description: '~22 презентации',
    popular: true,
  },
  {
    id: 'pack_large',
    name: 'Большой',
    nameEn: 'Large',
    tokens: 5000,
    price: 9.99,
    bonus: 1000,
    description: '~60 презентаций',
  },
  {
    id: 'pack_mega',
    name: 'Мега',
    nameEn: 'Mega',
    tokens: 15000,
    price: 24.99,
    bonus: 5000,
    description: '~200 презентаций',
  },
];

interface TokenTransaction {
  id: string;
  type: 'spend' | 'refill' | 'bonus' | 'purchase';
  amount: number;
  balanceAfter: number;
  action: string;
  description?: string;
  createdAt: Date;
}

interface UsageStats {
  presentationsCreated: number;
  aiEditsToday: number;
  dalleImagesUsed: number;
  dissertationGenerationsUsed: number;
  largeChapterGenerationsUsed: number;
  academicWorksCreated: number;
  academicGenerationsToday: number;
  chatMessagesToday: number;
  plagiarismChecksUsed: number;
  lastResetDate: string; // ISO date для дневного сброса
  lastMonthlyReset: string; // ISO date для месячного сброса
}

interface CostTracking {
  totalEstimatedCost: number;      // Общие затраты за период
  dailyCostEstimate: number;       // Затраты сегодня
  costBreakdown: Record<string, number>; // По категориям
}

interface ReferralInfo {
  referralCode: string;
  referralsCount: number;
  bonusTokensEarned: number;
  bonusLimitsEarned: {
    presentations: number;
    dalleImages: number;
    academicWorks: number;
  };
}

interface TrialInfo {
  isTrialActive: boolean;
  trialStartDate: string | null;
  trialEndDate: string | null;
  trialUsed: boolean;
}

interface SubscriptionState {
  // Текущий план
  currentPlan: PlanType;
  
  // Баланс токенов
  tokensBalance: number;
  tokensUsed: number;
  
  // ===== НОВАЯ СИСТЕМА ЛИМИТОВ =====
  usage: UsageStats;
  costTracking: CostTracking;
  referral: ReferralInfo;
  trial: TrialInfo;
  
  // Статистика (легаси - для совместимости)
  freePresentationsUsed: number;
  freePresentationsLimit: number;
  freeDissertationGenerationsUsed: number;
  freeDissertationGenerationsLimit: number;
  
  // История транзакций
  transactions: TokenTransaction[];
  
  // Дата окончания подписки
  subscriptionEndDate: Date | null;
  
  // Actions
  setPlan: (plan: PlanType) => void;
  addTokens: (amount: number, type: 'purchase' | 'bonus' | 'refill', description?: string) => void;
  spendTokens: (amount: number, action: string, description?: string) => boolean;
  canAfford: (action: keyof typeof TOKEN_COSTS) => boolean;
  getTokenCost: (action: keyof typeof TOKEN_COSTS) => number;
  incrementFreePresentations: () => void;
  canCreatePresentation: () => { allowed: boolean; reason?: string };
  
  // Dissertation actions
  incrementDissertationGenerations: () => void;
  canGenerateDissertationContent: () => { allowed: boolean; reason?: string };
  
  // ===== АКАДЕМИЧЕСКИЕ РАБОТЫ =====
  incrementAcademicWorks: () => void;
  incrementAcademicGenerations: () => void;
  canCreateAcademicWork: () => { allowed: boolean; reason?: string; remaining: number };
  canGenerateAcademicContent: () => { allowed: boolean; reason?: string; remaining: number };
  
  // Презентации
  incrementPresentations: () => void;
  incrementAiEdits: () => void;
  incrementDalleImages: () => void;
  canUseDalleImages: () => { allowed: boolean; reason?: string; remaining: number };
  canAiEdit: () => { allowed: boolean; reason?: string; remaining: number };
  
  // Диссертации
  incrementLargeChapterGeneration: () => void;
  canGenerateLargeChapter: () => { allowed: boolean; reason?: string; remaining: number };
  canGenerateFullDissertation: () => { allowed: boolean; reason?: string };
  
  // Чат и плагиат
  incrementChatMessages: () => void;
  incrementPlagiarismChecks: () => void;
  canSendChatMessage: () => { allowed: boolean; reason?: string; remaining: number };
  canCheckPlagiarism: () => { allowed: boolean; reason?: string; remaining: number };
  
  // Получение лимитов
  getLimits: () => typeof PLAN_LIMITS[PlanType];
  getRemainingLimits: () => {
    essays: number;
    referats: number;
    courseworks: number;
    analysis: number;
    presentations: number;
    dalleImages: number;
    chatMessages: number;
    plagiarismChecks: number;
    dissertationGenerations: number;
    largeChapters: number;
  };
  
  // Стоимость
  trackCost: (action: string, estimatedCost: number) => void;
  getCostAnalytics: () => CostTracking;
  getMarginInfo: () => { revenue: number; costs: number; margin: number; marginPercent: number };
  
  // Реферальная система
  applyReferralBonus: (isReferrer: boolean) => void;
  getReferralCode: () => string;
  
  // Пробный период
  startTrial: () => boolean;
  isTrialExpired: () => boolean;
  getTrialDaysLeft: () => number;
  
  // Сброс
  resetDailyLimits: () => void;
  resetMonthlyLimits: () => void;
  resetFreeLimits: () => void;
  checkAndResetLimits: () => void; // Авто-сброс
  
  // Обновление подписки
  renewPlan: () => void;
  canRenewPlan: () => { canRenew: boolean; daysLeft: number; reason?: string };
  getUsagePercentage: () => { overall: number; details: Record<string, number> };
  
  // ===== СИНХРОНИЗАЦИЯ С BACKEND =====
  syncToBackend: () => Promise<void>;
  fetchFromBackend: () => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => {
      // === Утилиты ===
      const today = () => new Date().toISOString().split('T')[0];
      const thisMonth = () => new Date().toISOString().slice(0, 7);
      const generateReferralCode = () => `SCI-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      // Безопасное получение плана (защита от удалённых планов в localStorage)
      const safePlan = (plan: PlanType): PlanType => {
        return plan in PLAN_LIMITS ? plan : 'starter';
      };
      
      const defaultUsage = (): UsageStats => ({
        presentationsCreated: 0,
        aiEditsToday: 0,
        dalleImagesUsed: 0,
        dissertationGenerationsUsed: 0,
        largeChapterGenerationsUsed: 0,
        academicWorksCreated: 0,
        academicGenerationsToday: 0,
        chatMessagesToday: 0,
        plagiarismChecksUsed: 0,
        lastResetDate: today(),
        lastMonthlyReset: thisMonth(),
      });
      
      return {
      currentPlan: 'free',
      tokensBalance: 1000,
      tokensUsed: 0,
      freePresentationsUsed: 0,
      freePresentationsLimit: 10,
      freeDissertationGenerationsUsed: 0,
      freeDissertationGenerationsLimit: 5,
      transactions: [],
      subscriptionEndDate: null,
      
      usage: defaultUsage(),
      
      costTracking: {
        totalEstimatedCost: 0,
        dailyCostEstimate: 0,
        costBreakdown: {},
      },
      
      referral: {
        referralCode: generateReferralCode(),
        referralsCount: 0,
        bonusTokensEarned: 0,
        bonusLimitsEarned: { presentations: 0, dalleImages: 0, academicWorks: 0 },
      },
      
      trial: {
        isTrialActive: false,
        trialStartDate: null,
        trialEndDate: null,
        trialUsed: false,
      },

      setPlan: (plan) => {
        const planData = SUBSCRIPTION_PLANS[plan];
        set({
          currentPlan: plan,
          tokensBalance: planData.tokens,
          subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          usage: defaultUsage(),
          costTracking: { totalEstimatedCost: 0, dailyCostEstimate: 0, costBreakdown: {} },
        });
      },

      addTokens: (amount, type, description) => {
        const state = get();
        const newBalance = state.tokensBalance + amount;
        const transaction: TokenTransaction = {
          id: `txn_${Date.now()}`,
          type, amount, balanceAfter: newBalance, action: type, description, createdAt: new Date(),
        };
        set({
          tokensBalance: newBalance,
          transactions: [transaction, ...state.transactions].slice(0, 100),
        });
      },

      spendTokens: (amount, action, description) => {
        const state = get();
        if (state.tokensBalance < amount) return false;
        
        const newBalance = state.tokensBalance - amount;
        const transaction: TokenTransaction = {
          id: `txn_${Date.now()}`,
          type: 'spend', amount: -amount, balanceAfter: newBalance,
          action, description, createdAt: new Date(),
        };
        set({
          tokensBalance: newBalance,
          tokensUsed: state.tokensUsed + amount,
          transactions: [transaction, ...state.transactions].slice(0, 100),
        });
        return true;
      },

      canAfford: (action) => {
        const state = get();
        return state.tokensBalance >= TOKEN_COSTS[action];
      },

      getTokenCost: (action) => TOKEN_COSTS[action],

      incrementFreePresentations: () => {
        const before = get().usage.presentationsCreated;
        set((state) => ({
          freePresentationsUsed: state.freePresentationsUsed + 1,
          usage: { ...state.usage, presentationsCreated: state.usage.presentationsCreated + 1 },
        }));
        get().trackCost('presentation', API_COSTS.presentation_generation);
        get().syncToBackend();
      },

      canCreatePresentation: () => {
        const state = get();
        state.checkAndResetLimits();
        const limits = PLAN_LIMITS[safePlan(state.currentPlan)];
        const bonus = state.referral.bonusLimitsEarned.presentations;
        const effectiveLimit = limits.presentationsPerMonth + bonus;
        
        if (state.usage.presentationsCreated >= effectiveLimit) {
          return { 
            allowed: false, 
            reason: `Лимит презентаций исчерпан (${state.usage.presentationsCreated}/${effectiveLimit}). Оформите подписку или пригласите друга!` 
          };
        }
        return { allowed: true };
      },

      resetFreeLimits: () => {
        set({ 
          freePresentationsUsed: 0, 
          freeDissertationGenerationsUsed: 0,
          usage: defaultUsage(),
        });
      },

      incrementDissertationGenerations: () => {
        const before = get().usage.dissertationGenerationsUsed;
        set((state) => ({
          freeDissertationGenerationsUsed: state.freeDissertationGenerationsUsed + 1,
          usage: { ...state.usage, dissertationGenerationsUsed: state.usage.dissertationGenerationsUsed + 1 },
        }));
        get().trackCost('dissertation_section', API_COSTS.dissertation_section);
        get().syncToBackend();
      },

      canGenerateDissertationContent: () => {
        const state = get();
        state.checkAndResetLimits();
        const limits = PLAN_LIMITS[safePlan(state.currentPlan)];
        
        if (state.usage.dissertationGenerationsUsed >= limits.essaysPerMonth) {
          return { 
            allowed: false, 
            reason: `Лимит AI-генераций исчерпан (${state.usage.dissertationGenerationsUsed}/${limits.essaysPerMonth}). Оформите подписку для продолжения.` 
          };
        }
        return { allowed: true };
      },

      // ===== АКАДЕМИЧЕСКИЕ РАБОТЫ =====
      
      incrementAcademicWorks: () => {
        const before = get().usage.academicWorksCreated;
        set((state) => ({
          usage: { ...state.usage, academicWorksCreated: state.usage.academicWorksCreated + 1 },
        }));
        get().trackCost('academic_work', API_COSTS.academic_work);
        get().syncToBackend();
      },
      
      incrementAcademicGenerations: () => {
        const state = get();
        const before = state.usage.academicGenerationsToday;
        const todayStr = today();
        if (state.usage.lastResetDate !== todayStr) {
          set({ usage: { ...state.usage, academicGenerationsToday: 1, lastResetDate: todayStr } });
        } else {
          set({ usage: { ...state.usage, academicGenerationsToday: state.usage.academicGenerationsToday + 1 } });
        }
        get().trackCost('academic_generation', API_COSTS.academic_work);
        get().syncToBackend();
      },
      
      canCreateAcademicWork: () => {
        const state = get();
        state.checkAndResetLimits();
        const limits = PLAN_LIMITS[safePlan(state.currentPlan)];
        const bonus = state.referral.bonusLimitsEarned.academicWorks;
        const effectiveLimit = limits.essaysPerMonth + bonus;
        const remaining = Math.max(0, effectiveLimit - state.usage.academicWorksCreated);
        
        if (remaining <= 0) {
          return {
            allowed: false,
            reason: `Лимит академических работ исчерпан (${effectiveLimit}/${effectiveLimit}). Оформите подписку.`,
            remaining: 0,
          };
        }
        return { allowed: true, remaining };
      },
      
      canGenerateAcademicContent: () => {
        const state = get();
        state.checkAndResetLimits();
        const limits = PLAN_LIMITS[safePlan(state.currentPlan)];
        const todayStr = today();
        const todayGenerations = state.usage.lastResetDate === todayStr ? state.usage.academicGenerationsToday : 0;
        const dailyLimit = limits.analysisPerMonth; // используем месячный лимит анализа
        const remaining = Math.max(0, dailyLimit - todayGenerations);
        
        if (remaining <= 0) {
          return {
            allowed: false,
            reason: `Лимит генераций для академических работ исчерпан. Оформите подписку.`,
            remaining: 0,
          };
        }
        return { allowed: true, remaining };
      },

      // ===== ПРЕЗЕНТАЦИИ =====
      
      getLimits: () => PLAN_LIMITS[safePlan(get().currentPlan)],

      getRemainingLimits: () => {
        const state = get();
        state.checkAndResetLimits();
        const limits = PLAN_LIMITS[safePlan(state.currentPlan)];
        const bonus = state.referral.bonusLimitsEarned;
        const calc = (used: number, limit: number) => Math.max(0, limit - used);
        const todayStr = today();
        const todayChats = state.usage.lastResetDate === todayStr ? state.usage.chatMessagesToday : 0;
        
        return {
          essays: calc(state.usage.academicWorksCreated, limits.essaysPerMonth + bonus.academicWorks),
          referats: calc(state.usage.academicWorksCreated, limits.referatsPerMonth),
          courseworks: calc(state.usage.largeChapterGenerationsUsed, limits.courseworksPerMonth),
          analysis: calc(state.usage.academicGenerationsToday, limits.analysisPerMonth),
          presentations: calc(state.usage.presentationsCreated, limits.presentationsPerMonth + bonus.presentations),
          dalleImages: calc(state.usage.dalleImagesUsed, limits.dalleImages + bonus.dalleImages),
          chatMessages: calc(todayChats, limits.chatMessagesPerDay),
          plagiarismChecks: calc(state.usage.plagiarismChecksUsed, limits.plagiarismChecks),
          dissertationGenerations: calc(state.usage.dissertationGenerationsUsed, limits.dissertationGenerations ?? 10),
          largeChapters: calc(state.usage.largeChapterGenerationsUsed, limits.largeChapterGenerations ?? 5),
        };
      },

      incrementPresentations: () => {
        const before = get().usage.presentationsCreated;
        set((state) => ({
          usage: { ...state.usage, presentationsCreated: state.usage.presentationsCreated + 1 },
          freePresentationsUsed: state.freePresentationsUsed + 1,
        }));
        get().trackCost('presentation', API_COSTS.presentation_generation);
        get().syncToBackend();
      },

      incrementAiEdits: () => {
        const state = get();
        const before = state.usage.aiEditsToday;
        const todayStr = today();
        if (state.usage.lastResetDate !== todayStr) {
          set({ usage: { ...state.usage, aiEditsToday: 1, lastResetDate: todayStr } });
        } else {
          set({ usage: { ...state.usage, aiEditsToday: state.usage.aiEditsToday + 1 } });
        }
        get().trackCost('slide_edit', API_COSTS.slide_ai_edit);
        get().syncToBackend();
      },

      incrementDalleImages: () => {
        const before = get().usage.dalleImagesUsed;
        set((state) => ({
          usage: { ...state.usage, dalleImagesUsed: state.usage.dalleImagesUsed + 1 }
        }));
        get().trackCost('dalle', API_COSTS.dalle3_per_image);
        get().syncToBackend();
      },

      canUseDalleImages: () => {
        const state = get();
        state.checkAndResetLimits();
        const limits = PLAN_LIMITS[safePlan(state.currentPlan)];
        const bonus = state.referral.bonusLimitsEarned.dalleImages;
        const remaining = (limits.dalleImages + bonus) - state.usage.dalleImagesUsed;
        
        if (remaining <= 0) {
          return {
            allowed: false,
            reason: 'Лимит AI-изображений исчерпан. Оформите подписку Pro.',
            remaining: 0,
          };
        }
        return { allowed: true, remaining };
      },

      canAiEdit: () => {
        const state = get();
        state.checkAndResetLimits();
        const limits = PLAN_LIMITS[safePlan(state.currentPlan)];
        const remaining = limits.analysisPerMonth - state.usage.academicWorksCreated;
        
        if (remaining <= 0) {
          return {
            allowed: false,
            reason: `Лимит анализов исчерпан (${limits.analysisPerMonth}/мес). Оформите подписку.`,
            remaining: 0,
          };
        }
        return { allowed: true, remaining };
      },

      // ===== ДИССЕРТАЦИИ =====
      
      incrementLargeChapterGeneration: () => {
        const before = get().usage.largeChapterGenerationsUsed;
        set((state) => ({
          usage: { ...state.usage, largeChapterGenerationsUsed: state.usage.largeChapterGenerationsUsed + 1 }
        }));
        get().trackCost('chapter', API_COSTS.dissertation_chapter);
        get().syncToBackend();
      },

      canGenerateLargeChapter: () => {
        const state = get();
        const limits = PLAN_LIMITS[safePlan(state.currentPlan)];
        const remaining = limits.courseworksPerMonth - state.usage.largeChapterGenerationsUsed;
        
        if (remaining <= 0) {
          return {
            allowed: false,
            reason: `Лимит курсовых исчерпан. Оформите Pro подписку.`,
            remaining: 0,
          };
        }
        return { allowed: true, remaining };
      },

      canGenerateFullDissertation: () => {
        const plan = safePlan(get().currentPlan);
        const limits = PLAN_LIMITS[plan];
        // Check the dedicated flag first
        if (!limits.fullDissertationGeneration) {
          return {
            allowed: false,
            reason: plan === 'free'
              ? 'Генерация полных работ доступна начиная с подписки Starter. Обновите план.'
              : plan === 'starter'
                ? 'Полная генерация диссертаций доступна на Pro подписке. На Starter вы можете генерировать по главам.'
                : 'Генерация полной диссертации недоступна на вашем плане.',
          };
        }
        return { allowed: true };
      },

      // ===== ЧАТ И ПЛАГИАТ =====
      
      incrementChatMessages: () => {
        const state = get();
        const before = state.usage.chatMessagesToday;
        const todayStr = today();
        if (state.usage.lastResetDate !== todayStr) {
          set({ usage: { ...state.usage, chatMessagesToday: 1, lastResetDate: todayStr } });
        } else {
          set({ usage: { ...state.usage, chatMessagesToday: state.usage.chatMessagesToday + 1 } });
        }
        get().trackCost('chat', API_COSTS.chat_message);
        get().syncToBackend();
      },
      
      incrementPlagiarismChecks: () => {
        const before = get().usage.plagiarismChecksUsed;
        set((state) => ({
          usage: { ...state.usage, plagiarismChecksUsed: state.usage.plagiarismChecksUsed + 1 }
        }));
        get().trackCost('plagiarism', API_COSTS.plagiarism_check);
        get().syncToBackend();
      },
      
      canSendChatMessage: () => {
        const state = get();
        state.checkAndResetLimits();
        const limits = PLAN_LIMITS[safePlan(state.currentPlan)];
        const todayStr = today();
        const todayMessages = state.usage.lastResetDate === todayStr ? state.usage.chatMessagesToday : 0;
        const remaining = limits.chatMessagesPerDay - todayMessages;
        
        if (remaining <= 0) {
          return {
            allowed: false,
            reason: `Дневной лимит сообщений исчерпан (${limits.chatMessagesPerDay}/день). Оформите подписку.`,
            remaining: 0,
          };
        }
        return { allowed: true, remaining };
      },
      
      canCheckPlagiarism: () => {
        const state = get();
        const limits = PLAN_LIMITS[safePlan(state.currentPlan)];
        const remaining = limits.plagiarismChecks - state.usage.plagiarismChecksUsed;
        
        if (remaining <= 0) {
          return {
            allowed: false,
            reason: `Лимит проверок на плагиат исчерпан. Оформите подписку.`,
            remaining: 0,
          };
        }
        return { allowed: true, remaining };
      },

      // ===== СТОИМОСТЬ И АНАЛИТИКА =====
      
      trackCost: (action, estimatedCost) => {
        set((state) => ({
          costTracking: {
            totalEstimatedCost: state.costTracking.totalEstimatedCost + estimatedCost,
            dailyCostEstimate: (state.usage.lastResetDate === today() ? state.costTracking.dailyCostEstimate : 0) + estimatedCost,
            costBreakdown: {
              ...state.costTracking.costBreakdown,
              [action]: (state.costTracking.costBreakdown[action] || 0) + estimatedCost,
            },
          },
        }));
      },
      
      getCostAnalytics: () => get().costTracking,
      
      getMarginInfo: () => {
        const state = get();
        const plan = SUBSCRIPTION_PLANS[state.currentPlan];
        const revenue = plan.price;
        const costs = state.costTracking.totalEstimatedCost;
        const margin = revenue - costs;
        const marginPercent = revenue > 0 ? Math.round((margin / revenue) * 100) : 0;
        return { revenue, costs: Math.round(costs * 100) / 100, margin: Math.round(margin * 100) / 100, marginPercent };
      },

      // ===== РЕФЕРАЛЬНАЯ СИСТЕМА =====
      
      applyReferralBonus: (isReferrer) => {
        const state = get();
        const bonus = isReferrer ? REFERRAL_BONUSES.referrerBonus : REFERRAL_BONUSES.refereeBonus;
        
        set((s) => ({
          tokensBalance: s.tokensBalance + bonus,
          referral: {
            ...s.referral,
            referralsCount: isReferrer ? s.referral.referralsCount + 1 : s.referral.referralsCount,
            bonusTokensEarned: s.referral.bonusTokensEarned + bonus,
            bonusLimitsEarned: isReferrer ? {
              presentations: s.referral.bonusLimitsEarned.presentations + REFERRAL_BONUSES.referrerExtraLimits.presentations,
              dalleImages: s.referral.bonusLimitsEarned.dalleImages + REFERRAL_BONUSES.referrerExtraLimits.dalleImages,
              academicWorks: s.referral.bonusLimitsEarned.academicWorks + REFERRAL_BONUSES.referrerExtraLimits.academicWorks,
            } : s.referral.bonusLimitsEarned,
          },
        }));
        
        // Записываем транзакцию
        state.addTokens(bonus, 'bonus', isReferrer ? 'Реферальный бонус за приглашённого друга' : 'Бонус за регистрацию по приглашению');
      },
      
      getReferralCode: () => get().referral.referralCode,

      // ===== ПРОБНЫЙ ПЕРИОД =====
      
      startTrial: () => {
        const state = get();
        if (state.trial.trialUsed || state.trial.trialUsed) return false;
        
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + TRIAL_CONFIG.durationDays * 24 * 60 * 60 * 1000);
        
        set({
          currentPlan: TRIAL_CONFIG.plan,
          tokensBalance: SUBSCRIPTION_PLANS[TRIAL_CONFIG.plan].tokens,
          subscriptionEndDate: endDate,
          trial: {
            isTrialActive: true,
            trialStartDate: startDate.toISOString(),
            trialEndDate: endDate.toISOString(),
            trialUsed: true,
          },
          usage: defaultUsage(),
        });
        return true;
      },
      
      isTrialExpired: () => {
        const state = get();
        if (!state.trial.isTrialActive || !state.trial.trialEndDate) return false;
        return new Date() > new Date(state.trial.trialEndDate);
      },
      
      getTrialDaysLeft: () => {
        const state = get();
        if (!state.trial.isTrialActive || !state.trial.trialEndDate) return 0;
        const diff = new Date(state.trial.trialEndDate).getTime() - Date.now();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      },

      // ===== СБРОСЫ =====
      
      resetDailyLimits: () => {
        set((state) => ({
          usage: {
            ...state.usage,
            aiEditsToday: 0,
            academicGenerationsToday: 0,
            chatMessagesToday: 0,
            lastResetDate: today(),
          },
          costTracking: { ...state.costTracking, dailyCostEstimate: 0 },
        }));
      },

      resetMonthlyLimits: () => {
        set((state) => ({
          usage: {
            ...state.usage,
            presentationsCreated: 0,
            dalleImagesUsed: 0,
            dissertationGenerationsUsed: 0,
            largeChapterGenerationsUsed: 0,
            academicWorksCreated: 0,
            plagiarismChecksUsed: 0,
            lastMonthlyReset: thisMonth(),
          },
          costTracking: { totalEstimatedCost: 0, dailyCostEstimate: 0, costBreakdown: {} },
          freePresentationsUsed: 0,
          freeDissertationGenerationsUsed: 0,
        }));
      },
      
      checkAndResetLimits: () => {
        const state = get();
        const todayStr = today();
        const monthStr = thisMonth();
        
        // Авто-сброс дневных лимитов
        if (state.usage.lastResetDate !== todayStr) {
          get().resetDailyLimits();
        }
        
        // Авто-сброс месячных лимитов
        if (state.usage.lastMonthlyReset !== monthStr) {
          get().resetMonthlyLimits();
        }
        
        // Проверка окончания триала
        if (state.trial.isTrialActive && get().isTrialExpired()) {
          set({
            currentPlan: 'free',
            tokensBalance: SUBSCRIPTION_PLANS.free.tokens,
            trial: { ...state.trial, isTrialActive: false },
            usage: defaultUsage(),
          });
        }
      },

      // ===== ОБНОВЛЕНИЕ ПОДПИСКИ =====
      renewPlan: () => {
        const state = get();
        const planData = SUBSCRIPTION_PLANS[state.currentPlan];
        
        set({
          tokensBalance: planData.tokens,
          tokensUsed: 0,
          subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          usage: defaultUsage(),
          costTracking: { totalEstimatedCost: 0, dailyCostEstimate: 0, costBreakdown: {} },
          freePresentationsUsed: 0,
          freeDissertationGenerationsUsed: 0,
        });
      },

      canRenewPlan: () => {
        const state = get();
        const limits = PLAN_LIMITS[safePlan(state.currentPlan)];
        const usage = state.usage;
        
        const usagePercent = {
          essays: limits.essaysPerMonth > 0 ? (usage.presentationsCreated / limits.essaysPerMonth) * 100 : 0,
          presentations: limits.presentationsPerMonth > 0 ? (usage.presentationsCreated / limits.presentationsPerMonth) * 100 : 0,
          dalle: limits.dalleImages > 0 ? (usage.dalleImagesUsed / limits.dalleImages) * 100 : 0,
          analysis: limits.analysisPerMonth > 0 ? (usage.academicWorksCreated / limits.analysisPerMonth) * 100 : 0,
        };
        
        const anyNearLimit = Object.values(usagePercent).some(p => p >= 80);
        const endDate = state.subscriptionEndDate;
        const daysLeft = endDate 
          ? Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : 0;
        
        if (false /* all plans are paid */) {
          return { canRenew: false, daysLeft: 0, reason: 'Для обновления нужна платная подписка' };
        }
        
        if (!anyNearLimit && daysLeft > 5) {
          return { canRenew: false, daysLeft, reason: `Достаточно лимитов. Осталось ${daysLeft} дней.` };
        }
        
        return { canRenew: true, daysLeft };
      },

      getUsagePercentage: () => {
        const state = get();
        const limits = PLAN_LIMITS[safePlan(state.currentPlan)];
        const usage = state.usage;
        
        const calcPercent = (used: number, limit: number) => 
          limit > 0 ? Math.round((used / limit) * 100) : 0;
        
        const details: Record<string, number> = {
          essays: calcPercent(usage.presentationsCreated, limits.essaysPerMonth),
          referats: calcPercent(usage.dissertationGenerationsUsed, limits.referatsPerMonth),
          presentations: calcPercent(usage.presentationsCreated, limits.presentationsPerMonth),
          dalleImages: calcPercent(usage.dalleImagesUsed, limits.dalleImages),
          analysis: calcPercent(usage.academicWorksCreated, limits.analysisPerMonth),
          plagiarismChecks: calcPercent(usage.plagiarismChecksUsed, limits.plagiarismChecks),
        };
        
        const values = Object.values(details).filter(v => v > 0);
        const overall = values.length > 0 
          ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
        
        return { overall, details };
      },

      // ===== СИНХРОНИЗАЦИЯ С BACKEND =====
      syncToBackend: async () => {
        const state = get();
        const usage = state.usage;
        
        // Отложенная синхронизация (debounce 2 секунды)
        if (syncDebounceTimer) {
          clearTimeout(syncDebounceTimer);
        }
        
        syncDebounceTimer = setTimeout(async () => {
          try {
            const token = useAuthStore.getState().token;
            if (!token) return; // Not logged in — skip sync
            await fetch(`${API_URL}/usage/sync`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                presentationsCreated: usage.presentationsCreated,
                academicWorksCreated: usage.academicWorksCreated,
                academicGenerationsToday: usage.academicGenerationsToday,
                chatMessagesToday: usage.chatMessagesToday,
                dalleImagesUsed: usage.dalleImagesUsed,
                plagiarismChecksUsed: usage.plagiarismChecksUsed,
                dissertationGenerationsUsed: usage.dissertationGenerationsUsed,
                largeChapterGenerationsUsed: usage.largeChapterGenerationsUsed,
                lastResetDate: usage.lastResetDate,
                lastMonthlyReset: usage.lastMonthlyReset,
              }),
            });
          } catch (_error) {
            // Silently fail — sync will retry on next action
          }
        }, 2000);
      },

      fetchFromBackend: async () => {
        try {
          const token = useAuthStore.getState().token;
          if (!token) return; // Not logged in — skip fetch
          const res = await fetch(`${API_URL}/usage/sync`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) return; // Silently ignore errors
          const response = await res.json() as {
            success: boolean;
            data: {
              presentationsCreated: number;
              academicWorksCreated: number;
              academicGenerationsToday: number;
              chatMessagesToday: number;
              dalleImagesUsed: number;
              plagiarismChecksUsed: number;
              dissertationGenerationsUsed: number;
              largeChapterGenerationsUsed: number;
              lastResetDate: string;
              lastMonthlyReset: string;
            };
          };
          
          if (response.success && response.data) {
            const backendData = response.data;
            
            // Бэкенд — источник правды для аккаунта.
            // Используем серверные значения напрямую, чтобы не тянуть лимиты чужого аккаунта.
            set((state) => ({
              usage: {
                ...state.usage,
                presentationsCreated: backendData.presentationsCreated || 0,
                academicWorksCreated: backendData.academicWorksCreated || 0,
                academicGenerationsToday: backendData.academicGenerationsToday || 0,
                chatMessagesToday: backendData.chatMessagesToday || 0,
                dalleImagesUsed: backendData.dalleImagesUsed || 0,
                plagiarismChecksUsed: backendData.plagiarismChecksUsed || 0,
                dissertationGenerationsUsed: backendData.dissertationGenerationsUsed || 0,
                largeChapterGenerationsUsed: backendData.largeChapterGenerationsUsed || 0,
              },
            }));
            
          }
        } catch (_error) {
          // Silently fail — will retry on next rehydration
        }
      },
    };
    },
    {
      name: 'subscription-storage',
      version: 3,
      migrate: (persistedState: unknown, version: number) => {
        if (!persistedState) return persistedState;
        const state = persistedState as Record<string, unknown>;
        // Миграция: удалённый план 'unlimited' -> 'premium'
        const validPlans: string[] = ['starter', 'pro', 'premium'];
        if (state.currentPlan === 'unlimited') {
          state.currentPlan = 'premium';
        } else if (state.currentPlan && !validPlans.includes(String(state.currentPlan))) {
          state.currentPlan = 'starter';
        }
        return state;
      },
      onRehydrateStorage: () => (state) => {
        // После загрузки из localStorage, синхронизируем с backend
        if (state) {
          // Small delay to ensure auth store is loaded
          setTimeout(() => {
            state.fetchFromBackend().catch(() => { /* handled */ });
          }, 500);
        }
      },
    }
  )
);

// ================== ХЕЛПЕРЫ ==================

export const formatTokens = (tokens: number): string => {
  if (tokens >= 1000000) return '\u221e';
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return tokens.toString();
};

export const estimatePresentations = (tokens: number, withDalle = false): number => {
  if (tokens >= 1000000) return Infinity;
  const cost = withDalle ? TOKEN_COSTS.presentation_dalle : TOKEN_COSTS.presentation;
  return Math.floor(tokens / cost);
};

// Расчёт затрат на API для заданного плана (для админки)
export const estimatePlanCosts = (plan: PlanType, usagePercent = 100): {
  essays: number;
  referats: number;
  courseworks: number;
  presentations: number;
  dalle: number;
  analysis: number;
  chat: number;
  total: number;
  margin: number;
} => {
  const limits = PLAN_LIMITS[plan];
  const price = SUBSCRIPTION_PLANS[plan].price;
  const factor = usagePercent / 100;
  
  const costs = {
    essays: limits.essaysPerMonth * API_COSTS.essay_generation * factor,
    referats: limits.referatsPerMonth * API_COSTS.referat_generation * factor,
    courseworks: limits.courseworksPerMonth * API_COSTS.coursework_generation * factor,
    presentations: limits.presentationsPerMonth * API_COSTS.presentation_generation * factor,
    dalle: limits.dalleImages * API_COSTS.dalle3_per_image * factor,
    analysis: limits.analysisPerMonth * API_COSTS.document_analysis * factor,
    chat: limits.chatMessagesPerDay * 30 * API_COSTS.chat_message * factor,
    total: 0,
    margin: 0,
  };
  
  costs.total = Object.values(costs).reduce((a, b) => a + b, 0);
  costs.margin = price > 0 ? Math.round(((price - costs.total) / price) * 100) : 0;
  
  return costs;
};
