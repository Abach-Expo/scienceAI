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
      id: 'starter',
      name: 'Starter',
      displayName: 'Стартер',
      price: { monthly: 5.99, annual: 57.50 },
      features: [
        '15 essays/month',
        '5 term papers/month',
        '2 courseworks/month',
        '20 analyses',
        '15 presentations/month',
        '3 DALL-E images',
        '50 chat messages/day',
        'PDF/PPTX/DOCX export',
      ],
      limits: {
        essaysPerMonth: 15,
        referatsPerMonth: 5,
        courseworksPerMonth: 2,
        analysisPerMonth: 20,
        presentationsPerMonth: 15,
        chatMessagesPerDay: 50,
        dalleImages: 3,
        antiAIDetection: false,
      },
    },
    {
      id: 'pro',
      name: 'Pro',
      displayName: 'Про',
      price: { monthly: 12.99, annual: 124.70 },
      popular: true,
      features: [
        '30 essays/month',
        '12 term papers/month',
        '5 courseworks/month',
        '50 analyses',
        '30 presentations/month',
        '10 DALL-E images',
        'Unlimited chat',
        'Anti-AI Detection',
        'Full dissertation up to 150 pages',
        'Plagiarism check',
        'Priority support',
      ],
      limits: {
        essaysPerMonth: 30,
        referatsPerMonth: 12,
        courseworksPerMonth: 5,
        analysisPerMonth: 50,
        presentationsPerMonth: 30,
        chatMessagesPerDay: -1,
        dalleImages: 10,
        antiAIDetection: true,
        maxDissertationPages: 150,
      },
    },
    {
      id: 'premium',
      name: 'Pro+',
      displayName: 'Pro+',
      price: { monthly: 24.99, annual: 239.90 },
      features: [
        '60 essays/month',
        '25 term papers/month',
        '10 courseworks/month',
        '100 analyses',
        '60 presentations/month',
        '25 DALL-E images',
        'Unlimited chat',
        'Anti-AI Detection v3',
        '3 full dissertations up to 300 pages',
        'Plagiarism check',
        'Priority support',
      ],
      limits: {
        essaysPerMonth: 60,
        referatsPerMonth: 25,
        courseworksPerMonth: 10,
        analysisPerMonth: 100,
        presentationsPerMonth: 60,
        chatMessagesPerDay: -1,
        dalleImages: 25,
        antiAIDetection: true,
        maxDissertationPages: 300,
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
          subscriptionPlan: 'free',
          subscriptionStatus: 'expired',
        },
      });
    }

    res.json({
      success: true,
      data: {
        plan: user.subscriptionPlan || 'free',
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
      starter: { essay: 15, referat: 5, coursework: 2, analysis: 20, presentation: 15, chat: 50 },
      pro: { essay: 30, referat: 12, coursework: 5, analysis: 50, presentation: 30, chat: -1 },
      premium: { essay: 60, referat: 25, coursework: 10, analysis: 100, presentation: 60, chat: -1 },
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
