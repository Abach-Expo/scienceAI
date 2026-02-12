import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

const router = Router();

// All subscription routes require auth
router.use(authMiddleware);

// ==========================================
// SUBSCRIPTION PLANS INFO
// ==========================================

/**
 * Get available subscription plans
 * GET /api/subscriptions/plans
 */
router.get('/plans', async (_req: Request, res: Response) => {
  const plans = [
    {
      id: 'free',
      name: 'Free',
      displayName: 'Бесплатный',
      price: { monthly: 0, annual: 0 },
      features: [
        '3 essays/month (Claude Sonnet 4)',
        '1 term paper/month',
        '5 document analyses (GPT-4o)',
        '2 presentations',
        '20 chat messages/day',
        'PDF export',
      ],
      limits: {
        essaysPerMonth: 3,
        referatsPerMonth: 1,
        courseworksPerMonth: 0,
        analysisPerMonth: 5,
        presentationsPerMonth: 2,
        chatMessagesPerDay: 20,
        dalleImages: 0,
        antiAIDetection: false,
      },
    },
    {
      id: 'starter',
      name: 'Starter',
      displayName: 'Стартер',
      price: { monthly: 5.99, annual: 57.50 },
      features: [
        '40 essays/month (Claude Sonnet 4)',
        '15 term papers/month',
        '5 courseworks/month',
        '50 analyses (GPT-4o)',
        '30 presentations/month',
        '10 DALL-E images',
        '500 chat messages/day',
        'Anti-AI Detection',
        'PDF/PPTX/DOCX export',
      ],
      limits: {
        essaysPerMonth: 40,
        referatsPerMonth: 15,
        courseworksPerMonth: 5,
        analysisPerMonth: 50,
        presentationsPerMonth: 30,
        chatMessagesPerDay: 500,
        dalleImages: 10,
        antiAIDetection: true,
      },
    },
    {
      id: 'pro',
      name: 'Pro',
      displayName: 'Про',
      price: { monthly: 12.99, annual: 124.70 },
      popular: true,
      features: [
        '90 essays/month (Claude Sonnet 4)',
        '35 term papers/month',
        '15 courseworks/month',
        '120 analyses (GPT-4o)',
        '70 presentations/month',
        '25 DALL-E images',
        'Unlimited chat',
        'Anti-AI Detection v3',
        'Plagiarism check',
        'Priority support',
      ],
      limits: {
        essaysPerMonth: 90,
        referatsPerMonth: 35,
        courseworksPerMonth: 15,
        analysisPerMonth: 120,
        presentationsPerMonth: 70,
        chatMessagesPerDay: -1,
        dalleImages: 25,
        antiAIDetection: true,
      },
    },
    {
      id: 'unlimited',
      name: 'Maximum',
      displayName: 'Максимум',
      price: { monthly: 24.99, annual: 239.90 },
      features: [
        '180 essays/month (Claude Sonnet 4)',
        '70 term papers/month',
        '40 courseworks/month',
        '250 analyses (GPT-4o)',
        '150 presentations/month',
        '60 DALL-E images',
        'Unlimited chat',
        'Anti-AI Detection v3',
        'API access',
        'Priority support',
      ],
      limits: {
        essaysPerMonth: 180,
        referatsPerMonth: 70,
        courseworksPerMonth: 40,
        analysisPerMonth: 250,
        presentationsPerMonth: 150,
        chatMessagesPerDay: -1,
        dalleImages: 60,
        antiAIDetection: true,
      },
    },
  ];

  res.json({ success: true, data: plans });
});

// ==========================================
// USER SUBSCRIPTION STATUS
// ==========================================

/**
 * Get current user's subscription status
 * GET /api/subscriptions/status
 */
router.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionExpiry: true,
        lemonSqueezyCustomerId: true,
        lemonSqueezySubscriptionId: true,
        aiGenerationsUsed: true,
        tokensUsed: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if subscription has expired
    let isActive = user.subscriptionStatus === 'active';
    if (user.subscriptionExpiry && new Date(user.subscriptionExpiry) < new Date()) {
      isActive = false;
      // Auto-downgrade expired subscription
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionPlan: 'starter',
          subscriptionStatus: 'expired',
        },
      });
    }

    res.json({
      success: true,
      data: {
        plan: user.subscriptionPlan || 'starter',
        status: isActive ? 'active' : (user.subscriptionStatus || 'inactive'),
        expiresAt: user.subscriptionExpiry,
        usage: {
          aiGenerations: user.aiGenerationsUsed || 0,
          tokensUsed: user.tokensUsed || 0,
        },
        hasLemonSqueezy: !!user.lemonSqueezySubscriptionId,
      },
    });
  } catch (error: unknown) {
    logger.error(`Get subscription status error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({ success: false, message: 'Failed to get subscription status' });
  }
});

// ==========================================
// USAGE TRACKING
// ==========================================

/**
 * Get usage history
 * GET /api/subscriptions/usage?period=30d
 */
router.get('/usage', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const period = (req.query.period as string) || '30d';
    const days = parseInt(period) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const usageLogs = await prisma.usageLog.findMany({
      where: {
        userId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Aggregate by action type
    const summary: Record<string, { count: number; tokensUsed: number }> = {};
    for (const log of usageLogs) {
      if (!summary[log.action]) {
        summary[log.action] = { count: 0, tokensUsed: 0 };
      }
      summary[log.action].count++;
      summary[log.action].tokensUsed += log.tokensUsed;
    }

    res.json({
      success: true,
      data: {
        period: `${days}d`,
        totalActions: usageLogs.length,
        summary,
        recentLogs: usageLogs.slice(0, 20).map(log => ({
          action: log.action,
          tokensUsed: log.tokensUsed,
          details: log.details ? JSON.parse(log.details) : null,
          createdAt: log.createdAt,
        })),
      },
    });
  } catch (error: unknown) {
    logger.error(`Get usage error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({ success: false, message: 'Failed to get usage data' });
  }
});

/**
 * Check if user can perform an action based on limits
 * POST /api/subscriptions/check-limit
 */
router.post('/check-limit', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { action } = req.body; // 'ai_generation', 'create_project', 'export'

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionPlan: true,
        subscriptionStatus: true,
        aiGenerationsUsed: true,
        tokensUsed: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const plan = user.subscriptionPlan || 'starter';
    const limits: Record<string, Record<string, number>> = {
      starter: { essay: 40, referat: 15, coursework: 5, analysis: 50, presentation: 30, chat: 500 },
      pro: { essay: 90, referat: 35, coursework: 15, analysis: 120, presentation: 70, chat: -1 },
      premium: { essay: 180, referat: 70, coursework: 40, analysis: 250, presentation: 150, chat: -1 },
    };

    const planLimits = limits[plan] || limits.starter;
    const limit = planLimits[action];

    if (limit === -1) {
      return res.json({ success: true, data: { allowed: true, remaining: -1 } });
    }

    const used = action === 'ai_generation' ? (user.aiGenerationsUsed || 0) : 0;
    const remaining = Math.max(0, (limit || 0) - used);

    res.json({
      success: true,
      data: {
        allowed: remaining > 0,
        remaining,
        limit,
        used,
        plan,
      },
    });
  } catch (error: unknown) {
    logger.error(`Check limit error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({ success: false, message: 'Failed to check limit' });
  }
});

export default router;
