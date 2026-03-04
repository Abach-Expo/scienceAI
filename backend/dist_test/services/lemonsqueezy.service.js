"use strict";
/**
 * 🍋 LEMONSQUEEZY SERVICE
 * Единственный платёжный провайдер для Science AI
 *
 * Документация: https://docs.lemonsqueezy.com/api
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VARIANT_TO_PLAN = exports.LEMONSQUEEZY_WEBHOOK_SECRET = exports.LEMONSQUEEZY_STORE_ID = exports.LEMONSQUEEZY_API_KEY = exports.LS_VARIANT_IDS = void 0;
exports.createLSCheckout = createLSCheckout;
exports.getLSSubscription = getLSSubscription;
exports.cancelLSSubscription = cancelLSSubscription;
exports.resumeLSSubscription = resumeLSSubscription;
exports.changeLSPlan = changeLSPlan;
exports.verifyWebhookSignature = verifyWebhookSignature;
exports.getPlanFromWebhook = getPlanFromWebhook;
exports.initLemonSqueezy = initLemonSqueezy;
const lemonsqueezy_js_1 = require("@lemonsqueezy/lemonsqueezy.js");
const logger_1 = require("../utils/logger");
// ================== ИНИЦИАЛИЗАЦИЯ ==================
const LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY || '';
exports.LEMONSQUEEZY_API_KEY = LEMONSQUEEZY_API_KEY;
const LEMONSQUEEZY_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID || '';
exports.LEMONSQUEEZY_STORE_ID = LEMONSQUEEZY_STORE_ID;
const LEMONSQUEEZY_WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '';
exports.LEMONSQUEEZY_WEBHOOK_SECRET = LEMONSQUEEZY_WEBHOOK_SECRET;
// Variant IDs для каждого плана (создаются в LemonSqueezy Dashboard)
exports.LS_VARIANT_IDS = {
    starter_monthly: process.env.LS_VARIANT_STARTER_MONTHLY || '',
    starter_annual: process.env.LS_VARIANT_STARTER_ANNUAL || '',
    pro_monthly: process.env.LS_VARIANT_PRO_MONTHLY || '',
    pro_annual: process.env.LS_VARIANT_PRO_ANNUAL || '',
    premium_monthly: process.env.LS_VARIANT_PREMIUM_MONTHLY || '',
    premium_annual: process.env.LS_VARIANT_PREMIUM_ANNUAL || '',
};
// Маппинг обратно: variantId → planId
const VARIANT_TO_PLAN = {};
exports.VARIANT_TO_PLAN = VARIANT_TO_PLAN;
Object.entries(exports.LS_VARIANT_IDS).forEach(([key, variantId]) => {
    if (variantId) {
        const [planId, period] = key.split('_');
        VARIANT_TO_PLAN[variantId] = { planId, period };
    }
});
// Инициализация SDK
let isInitialized = false;
function initLemonSqueezy() {
    if (isInitialized)
        return;
    if (!LEMONSQUEEZY_API_KEY) {
        logger_1.logger.warn('LemonSqueezy API key not configured');
        return;
    }
    (0, lemonsqueezy_js_1.lemonSqueezySetup)({ apiKey: LEMONSQUEEZY_API_KEY });
    isInitialized = true;
    logger_1.logger.info('LemonSqueezy SDK initialized');
}
/**
 * Создание Checkout Session через LemonSqueezy API
 * Возвращает URL для перенаправления клиента
 */
async function createLSCheckout(params) {
    initLemonSqueezy();
    const { planId, billingPeriod, userEmail, userId, userName, successUrl, cancelUrl } = params;
    // Получаем Variant ID
    const variantKey = `${planId}_${billingPeriod}`;
    const variantId = exports.LS_VARIANT_IDS[variantKey];
    if (!variantId) {
        throw new Error(`No LemonSqueezy variant configured for ${planId}/${billingPeriod}`);
    }
    if (!LEMONSQUEEZY_STORE_ID) {
        throw new Error('LemonSqueezy store ID not configured');
    }
    const { data, error } = await (0, lemonsqueezy_js_1.createCheckout)(LEMONSQUEEZY_STORE_ID, variantId, {
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
        logger_1.logger.error('LemonSqueezy checkout error:', error);
        throw new Error(`Failed to create checkout: ${JSON.stringify(error)}`);
    }
    const checkoutUrl = data?.data?.attributes?.url;
    const checkoutId = data?.data?.id;
    if (!checkoutUrl) {
        throw new Error('No checkout URL returned from LemonSqueezy');
    }
    logger_1.logger.info(`LemonSqueezy checkout created: ${checkoutId} for user ${userId}, plan ${planId}/${billingPeriod}`);
    return { url: checkoutUrl, checkoutId: checkoutId || '' };
}
// ================== ПОДПИСКИ ==================
/**
 * Получить данные подписки по ID
 */
async function getLSSubscription(subscriptionId) {
    initLemonSqueezy();
    const { data, error } = await (0, lemonsqueezy_js_1.getSubscription)(subscriptionId);
    if (error) {
        logger_1.logger.error(`Failed to get subscription ${subscriptionId}:`, error);
        throw new Error(`Failed to get subscription: ${JSON.stringify(error)}`);
    }
    return data?.data;
}
/**
 * Отменить подписку (в конце периода)
 */
async function cancelLSSubscription(subscriptionId) {
    initLemonSqueezy();
    const { data, error } = await (0, lemonsqueezy_js_1.cancelSubscription)(subscriptionId);
    if (error) {
        logger_1.logger.error(`Failed to cancel subscription ${subscriptionId}:`, error);
        throw new Error(`Failed to cancel subscription: ${JSON.stringify(error)}`);
    }
    logger_1.logger.info(`Subscription ${subscriptionId} cancelled`);
    return data?.data;
}
/**
 * Возобновить подписку (если отменена, но ещё не истекла)
 */
async function resumeLSSubscription(subscriptionId) {
    initLemonSqueezy();
    const { data, error } = await (0, lemonsqueezy_js_1.updateSubscription)(subscriptionId, {
        cancelled: false,
    });
    if (error) {
        logger_1.logger.error(`Failed to resume subscription ${subscriptionId}:`, error);
        throw new Error(`Failed to resume subscription: ${JSON.stringify(error)}`);
    }
    logger_1.logger.info(`Subscription ${subscriptionId} resumed`);
    return data?.data;
}
/**
 * Сменить план (upgrade/downgrade)
 */
async function changeLSPlan(subscriptionId, newPlanId, newPeriod) {
    initLemonSqueezy();
    const variantKey = `${newPlanId}_${newPeriod}`;
    const newVariantId = exports.LS_VARIANT_IDS[variantKey];
    if (!newVariantId) {
        throw new Error(`No variant for plan ${newPlanId}/${newPeriod}`);
    }
    const { data, error } = await (0, lemonsqueezy_js_1.updateSubscription)(subscriptionId, {
        variantId: parseInt(newVariantId),
    });
    if (error) {
        logger_1.logger.error(`Failed to change plan for ${subscriptionId}:`, error);
        throw new Error(`Failed to change plan: ${JSON.stringify(error)}`);
    }
    logger_1.logger.info(`Subscription ${subscriptionId} changed to ${newPlanId}/${newPeriod}`);
    return data?.data;
}
// ================== WEBHOOK ВАЛИДАЦИЯ ==================
const crypto_1 = __importDefault(require("crypto"));
/**
 * Проверка подписи вебхука LemonSqueezy
 */
function verifyWebhookSignature(rawBody, signature) {
    if (!LEMONSQUEEZY_WEBHOOK_SECRET) {
        logger_1.logger.warn('Webhook secret not configured, skipping verification');
        return false;
    }
    const hmac = crypto_1.default.createHmac('sha256', LEMONSQUEEZY_WEBHOOK_SECRET);
    const digest = hmac.update(rawBody).digest('hex');
    return crypto_1.default.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}
/**
 * Получить planId из webhook event (через variant_id или custom data)
 */
function getPlanFromWebhook(eventData) {
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
//# sourceMappingURL=lemonsqueezy.service.js.map