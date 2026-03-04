/**
 * 🎫 USAGE LIMIT MIDDLEWARE
 * Проверка лимитов AI-генераций по подписке
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
type SubscriptionPlan = 'free' | 'starter' | 'pro' | 'premium';
export declare const SUBSCRIPTION_LIMITS: {
    readonly free: {
        readonly name: "Free";
        readonly aiGenerations: 10;
        readonly tokensLimit: 5000;
        readonly gpt4oTokensLimit: 0;
        readonly maxTokensPerRequest: 4000;
        readonly models: readonly ["gpt-4o-mini"];
        readonly features: readonly ["basic"];
        readonly periodDays: 30;
    };
    readonly starter: {
        readonly name: "Starter";
        readonly aiGenerations: 100;
        readonly tokensLimit: 50000;
        readonly gpt4oTokensLimit: 10000;
        readonly maxTokensPerRequest: 8000;
        readonly models: readonly ["gpt-4o-mini", "gpt-4o"];
        readonly features: readonly ["basic", "export"];
        readonly periodDays: 30;
    };
    readonly pro: {
        readonly name: "Professional";
        readonly aiGenerations: 500;
        readonly tokensLimit: 200000;
        readonly gpt4oTokensLimit: 100000;
        readonly maxTokensPerRequest: 16000;
        readonly models: readonly ["gpt-4o-mini", "gpt-4o"];
        readonly features: readonly ["all"];
        readonly periodDays: 30;
    };
    readonly premium: {
        readonly name: "Premium";
        readonly aiGenerations: 2000;
        readonly tokensLimit: 1000000;
        readonly gpt4oTokensLimit: 500000;
        readonly maxTokensPerRequest: 16000;
        readonly models: readonly ["gpt-4o-mini", "gpt-4o"];
        readonly features: readonly ["all"];
        readonly periodDays: 30;
    };
};
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
/**
 * Middleware для проверки лимитов перед AI-генерацией
 */
export declare function checkUsageLimits(req: AuthRequestWithUsage, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * 🔒 Валидация модели и токенов перед запросом
 */
export declare function validateModelAccess(requestedModel: string, requestedTokens: number, usageLimits: {
    allowedModels: string[];
    maxTokensPerRequest: number;
    gpt4oTokensLimit: number;
    [key: string]: unknown;
}): {
    valid: boolean;
    error?: string;
    suggestedModel?: string;
};
/**
 * Записывает использование после успешной генерации
 */
export declare function recordUsage(userId: string, tokensUsed: number, action: string, details?: Record<string, unknown>, model?: string): Promise<void>;
/**
 * Получает информацию об использовании
 */
export declare function getUsageInfo(userId: string): Promise<UsageInfo>;
/**
 * Активирует подписку
 */
export declare function activateSubscription(userId: string, plan: SubscriptionPlan, lemonSqueezySubscriptionId?: string): Promise<void>;
declare const _default: {
    checkUsageLimits: typeof checkUsageLimits;
    recordUsage: typeof recordUsage;
    validateModelAccess: typeof validateModelAccess;
    getUsageInfo: typeof getUsageInfo;
    activateSubscription: typeof activateSubscription;
    SUBSCRIPTION_LIMITS: {
        readonly free: {
            readonly name: "Free";
            readonly aiGenerations: 10;
            readonly tokensLimit: 5000;
            readonly gpt4oTokensLimit: 0;
            readonly maxTokensPerRequest: 4000;
            readonly models: readonly ["gpt-4o-mini"];
            readonly features: readonly ["basic"];
            readonly periodDays: 30;
        };
        readonly starter: {
            readonly name: "Starter";
            readonly aiGenerations: 100;
            readonly tokensLimit: 50000;
            readonly gpt4oTokensLimit: 10000;
            readonly maxTokensPerRequest: 8000;
            readonly models: readonly ["gpt-4o-mini", "gpt-4o"];
            readonly features: readonly ["basic", "export"];
            readonly periodDays: 30;
        };
        readonly pro: {
            readonly name: "Professional";
            readonly aiGenerations: 500;
            readonly tokensLimit: 200000;
            readonly gpt4oTokensLimit: 100000;
            readonly maxTokensPerRequest: 16000;
            readonly models: readonly ["gpt-4o-mini", "gpt-4o"];
            readonly features: readonly ["all"];
            readonly periodDays: 30;
        };
        readonly premium: {
            readonly name: "Premium";
            readonly aiGenerations: 2000;
            readonly tokensLimit: 1000000;
            readonly gpt4oTokensLimit: 500000;
            readonly maxTokensPerRequest: 16000;
            readonly models: readonly ["gpt-4o-mini", "gpt-4o"];
            readonly features: readonly ["all"];
            readonly periodDays: 30;
        };
    };
};
export default _default;
//# sourceMappingURL=usage.middleware.d.ts.map