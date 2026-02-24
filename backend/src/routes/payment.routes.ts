/**
 * PAYMENT ROUTES - LemonSqueezy Only
 * 
 * POST /api/payments/create-checkout    - Checkout session
 * POST /api/payments/webhook            - Webhook from LemonSqueezy
 * POST /api/payments/verify             - Verify subscription status
 * POST /api/payments/cancel             - Cancel subscription
 * POST /api/payments/resume             - Resume subscription
 * POST /api/payments/change-plan        - Change plan
 * GET  /api/payments/status             - Current user subscription status
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index';
import { logger } from '../utils/logger';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { SUBSCRIPTION_LIMITS } from '../middleware/usage.middleware';
import {
  createLSCheckout,
  getLSSubscription,
  cancelLSSubscription,
  resumeLSSubscription,
  changeLSPlan,
  verifyWebhookSignature,
  getPlanFromWebhook,
} from '../services/lemonsqueezy.service';

const router = Router();

// ================== PLAN LIMIT HELPERS ==================

type PlanId = keyof typeof SUBSCRIPTION_LIMITS;

function getTokensLimit(planId: string): number {
  const plan = SUBSCRIPTION_LIMITS[planId as PlanId];
  return plan ? plan.tokensLimit : SUBSCRIPTION_LIMITS.starter.tokensLimit;
}

function getAiGenerationsLimit(planId: string): number {
  const plan = SUBSCRIPTION_LIMITS[planId as PlanId];
  return plan ? plan.aiGenerations : SUBSCRIPTION_LIMITS.starter.aiGenerations;
}

// ================== CREATE CHECKOUT ==================

router.post('/create-checkout', authMiddleware, [
  body('planId').isIn(['starter', 'pro', 'premium']),
  body('billingPeriod').optional().isIn(['monthly', 'annual']),
  body('email').isEmail(),
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { planId, billingPeriod = 'monthly', email } = req.body;
    const userId = (req as AuthRequest).userId || '';

    const result = await createLSCheckout({
      planId,
      billingPeriod,
      userEmail: email,
      userId,
      successUrl: `${process.env.FRONTEND_URL || 'https://science-ai.app'}/settings?payment=success`,
      cancelUrl: `${process.env.FRONTEND_URL || 'https://science-ai.app'}/pricing?payment=cancelled`,
    });

    logger.info(`Checkout created for ${email}: plan=${planId}, period=${billingPeriod}`);

    return res.json({
      success: true,
      checkoutUrl: result.url,
      checkoutId: result.checkoutId,
    });
  } catch (error: unknown) {
    logger.error('Create checkout error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create checkout',
    });
  }
});

// ================== WEBHOOK ==================

router.post('/webhook', async (req: Request, res: Response) => {
  try {
    // Raw body is a Buffer when express.raw() is used
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
    const signature = req.headers['x-signature'] as string || '';

    if (!signature) {
      logger.warn('Missing webhook signature');
      return res.status(401).json({ error: 'Missing signature' });
    }
    if (!verifyWebhookSignature(rawBody, signature)) {
      logger.warn('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = Buffer.isBuffer(req.body) ? JSON.parse(rawBody) : req.body;
    const eventName = event?.meta?.event_name;
    const customData = event?.meta?.custom_data;
    const eventData = event?.data;
    const attributes = eventData?.attributes;

    logger.info(`LemonSqueezy webhook: ${eventName}`, {
      subscriptionId: eventData?.id,
      customData,
    });

    const userId = customData?.user_id;
    const userEmail = attributes?.user_email || customData?.email;

    let user = null;
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    }
    if (!user && userEmail) {
      user = await prisma.user.findUnique({ where: { email: userEmail } });
    }

    if (!user) {
      logger.error(`User not found for webhook: userId=${userId}, email=${userEmail}`);
      return res.status(200).json({ received: true, warning: 'User not found' });
    }

    const planInfo = getPlanFromWebhook(event);
    const subscriptionId = String(eventData?.id || '');
    const lsCustomerId = String(attributes?.customer_id || '');

    switch (eventName) {
      case 'subscription_created':
      case 'subscription_resumed': {
        const planId = planInfo?.planId || 'starter';
        const renewsAt = attributes?.renews_at ? new Date(attributes.renews_at) : null;
        const endsAt = attributes?.ends_at ? new Date(attributes.ends_at) : null;

        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionPlan: planId,
            subscriptionStatus: 'active',
            subscriptionExpiry: renewsAt || endsAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            lemonSqueezyCustomerId: lsCustomerId || undefined,
            lemonSqueezySubscriptionId: subscriptionId || undefined,
            tokensLimit: getTokensLimit(planId),
            tokensUsed: 0,
            aiGenerationsUsed: 0,
            aiGenerationsLimit: getAiGenerationsLimit(planId),
            currentPeriodStart: new Date(),
            currentPeriodEnd: renewsAt || endsAt,
          },
        });

        logger.info(`Subscription activated: user=${user.id}, plan=${planId}`);
        break;
      }

      case 'subscription_updated': {
        const status = attributes?.status;
        const planId = planInfo?.planId || user.subscriptionPlan;
        const renewsAt = attributes?.renews_at ? new Date(attributes.renews_at) : null;

        const mappedStatus =
          status === 'active' || status === 'on_trial' ? 'active' :
          status === 'past_due' || status === 'unpaid' ? 'past_due' :
          status === 'cancelled' ? 'cancelled' :
          status === 'expired' ? 'expired' : 'active';

        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionPlan: planId,
            subscriptionStatus: mappedStatus,
            subscriptionExpiry: renewsAt || undefined,
            lemonSqueezySubscriptionId: subscriptionId || undefined,
            tokensLimit: getTokensLimit(planId),
            aiGenerationsLimit: getAiGenerationsLimit(planId),
          },
        });

        logger.info(`Subscription updated: user=${user.id}, plan=${planId}, status=${mappedStatus}`);
        break;
      }

      case 'subscription_cancelled': {
        const endsAt = attributes?.ends_at ? new Date(attributes.ends_at) : null;

        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionStatus: 'cancelled',
            subscriptionExpiry: endsAt || undefined,
          },
        });

        logger.info(`Subscription cancelled: user=${user.id}, ends_at=${endsAt}`);
        break;
      }

      case 'subscription_expired': {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionPlan: 'starter',
            subscriptionStatus: 'expired',
            tokensLimit: getTokensLimit('starter'),
            aiGenerationsLimit: getAiGenerationsLimit('starter'),
          },
        });

        logger.info(`Subscription expired: user=${user.id}, downgraded to starter`);
        break;
      }

      case 'subscription_payment_success': {
        const planId = planInfo?.planId || user.subscriptionPlan;
        const renewsAt = attributes?.renews_at ? new Date(attributes.renews_at) : null;

        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionStatus: 'active',
            subscriptionExpiry: renewsAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            tokensUsed: 0,
            aiGenerationsUsed: 0,
            currentPeriodStart: new Date(),
            currentPeriodEnd: renewsAt,
          },
        });

        logger.info(`Payment success: user=${user.id}, plan=${planId}`);
        break;
      }

      case 'subscription_payment_failed': {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionStatus: 'past_due',
          },
        });

        logger.warn(`Payment failed: user=${user.id}`);
        break;
      }

      default:
        logger.info(`Unhandled webhook event: ${eventName}`);
    }

    return res.status(200).json({ received: true });

  } catch (error: unknown) {
    logger.error('Webhook processing error:', error);
    return res.status(200).json({ received: true });
  }
});

// ================== VERIFY SUBSCRIPTION ==================

router.post('/verify', authMiddleware, [
  body('subscriptionId').isString().notEmpty(),
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { subscriptionId } = req.body;
    const subscription = await getLSSubscription(subscriptionId);

    if (!subscription) {
      return res.json({ active: false });
    }

    const attributes = subscription.attributes;
    const isActive = attributes.status === 'active' || attributes.status === 'on_trial';

    return res.json({
      active: isActive,
      status: attributes.status,
      planId: attributes.variant_name?.toLowerCase() || null,
      renewsAt: attributes.renews_at,
      endsAt: attributes.ends_at,
      cardBrand: attributes.card_brand,
      cardLastFour: attributes.card_last_four,
    });
  } catch (error: unknown) {
    logger.error('Verify subscription error:', error);
    return res.status(500).json({ active: false, error: 'Failed to verify subscription' });
  }
});

// ================== CANCEL SUBSCRIPTION ==================

router.post('/cancel', authMiddleware, [
  body('subscriptionId').isString().notEmpty(),
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { subscriptionId } = req.body;
    await cancelLSSubscription(subscriptionId);
    return res.json({ success: true, message: 'Subscription will be cancelled at period end' });
  } catch (error: unknown) {
    logger.error('Cancel subscription error:', error);
    return res.status(500).json({ success: false, error: 'Failed to cancel subscription' });
  }
});

// ================== RESUME SUBSCRIPTION ==================

router.post('/resume', authMiddleware, [
  body('subscriptionId').isString().notEmpty(),
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { subscriptionId } = req.body;
    await resumeLSSubscription(subscriptionId);
    return res.json({ success: true, message: 'Subscription resumed' });
  } catch (error: unknown) {
    logger.error('Resume subscription error:', error);
    return res.status(500).json({ success: false, error: 'Failed to resume subscription' });
  }
});

// ================== CHANGE PLAN ==================

router.post('/change-plan', authMiddleware, [
  body('subscriptionId').isString().notEmpty(),
  body('newPlanId').isIn(['starter', 'pro', 'premium']),
  body('newPeriod').optional().isIn(['monthly', 'annual']),
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { subscriptionId, newPlanId, newPeriod = 'monthly' } = req.body;
    await changeLSPlan(subscriptionId, newPlanId, newPeriod);
    return res.json({ success: true, message: `Plan changed to ${newPlanId}` });
  } catch (error: unknown) {
    logger.error('Change plan error:', error);
    return res.status(500).json({ success: false, error: 'Failed to change plan' });
  }
});

// ================== SUBSCRIPTION STATUS ==================

router.get('/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionExpiry: true,
        lemonSqueezySubscriptionId: true,
        lemonSqueezyCustomerId: true,
        tokensUsed: true,
        tokensLimit: true,
        aiGenerationsUsed: true,
        aiGenerationsLimit: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.subscriptionExpiry && new Date(user.subscriptionExpiry) < new Date()) {
      if (user.subscriptionStatus === 'active') {
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionStatus: 'expired',
            subscriptionPlan: 'starter',
          },
        });
        user.subscriptionStatus = 'expired';
        user.subscriptionPlan = 'starter';
      }
    }

    return res.json({
      success: true,
      subscription: {
        plan: user.subscriptionPlan,
        status: user.subscriptionStatus,
        expiresAt: user.subscriptionExpiry,
        subscriptionId: user.lemonSqueezySubscriptionId,
        customerId: user.lemonSqueezyCustomerId,
        usage: {
          tokensUsed: user.tokensUsed,
          tokensLimit: user.tokensLimit,
          aiGenerationsUsed: user.aiGenerationsUsed,
          aiGenerationsLimit: user.aiGenerationsLimit,
        },
        periodStart: user.currentPeriodStart,
        periodEnd: user.currentPeriodEnd,
      },
    });
  } catch (error: unknown) {
    logger.error('Get subscription status error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get subscription status' });
  }
});

export default router;
