import { Router, Response } from 'express';
import { prisma } from '../index';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

const router = Router();

// All usage routes require auth
router.use(authMiddleware);

/**
 * Get current usage stats from database
 * GET /api/usage/sync
 */
router.get('/sync', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        presentationsCreated: true,
        academicWorksCreated: true,
        academicGenerationsToday: true,
        chatMessagesToday: true,
        dalleImagesUsed: true,
        plagiarismChecksUsed: true,
        dissertationGenerationsUsed: true,
        largeChapterGenerationsUsed: true,
        usageLastResetDate: true,
        usageLastMonthlyReset: true,
        tokensUsed: true,
        tokensLimit: true,
        subscriptionPlan: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    logger.info(`[USAGE SYNC] GET for user ${userId}: presentations=${user.presentationsCreated}, academic=${user.academicWorksCreated}`);

    res.json({
      success: true,
      data: {
        presentationsCreated: user.presentationsCreated,
        academicWorksCreated: user.academicWorksCreated,
        academicGenerationsToday: user.academicGenerationsToday,
        chatMessagesToday: user.chatMessagesToday,
        dalleImagesUsed: user.dalleImagesUsed,
        plagiarismChecksUsed: user.plagiarismChecksUsed,
        dissertationGenerationsUsed: user.dissertationGenerationsUsed,
        largeChapterGenerationsUsed: user.largeChapterGenerationsUsed,
        lastResetDate: user.usageLastResetDate?.toISOString() || new Date().toISOString(),
        lastMonthlyReset: user.usageLastMonthlyReset?.toISOString() || new Date().toISOString(),
        tokensUsed: user.tokensUsed,
        tokensLimit: user.tokensLimit,
        subscriptionPlan: user.subscriptionPlan,
      },
    });
  } catch (error: unknown) {
    logger.error(`[USAGE SYNC] GET error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({ success: false, message: 'Failed to get usage data' });
  }
});

/**
 * Sync usage stats to database (server-authoritative)
 * POST /api/usage/sync
 * Only allows incrementing counters, never setting arbitrary values
 */
router.post('/sync', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Only allow specific increment operations, not direct value setting
    const { increments } = req.body;

    if (!increments || typeof increments !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid request: expected { increments: { field: amount } }' });
    }

    const validFields = [
      'presentationsCreated',
      'academicWorksCreated',
      'academicGenerationsToday',
      'chatMessagesToday',
      'dalleImagesUsed',
      'plagiarismChecksUsed',
      'dissertationGenerationsUsed',
      'largeChapterGenerationsUsed',
    ];

    // Build increment-only update data
    const updateData: Record<string, { increment: number }> = {};
    for (const [field, amount] of Object.entries(increments)) {
      if (!validFields.includes(field)) {
        continue; // Skip invalid fields silently
      }
      const numAmount = Number(amount);
      if (!Number.isInteger(numAmount) || numAmount < 0 || numAmount > 100) {
        continue; // Skip invalid amounts (must be 0-100 positive integers)
      }
      if (numAmount > 0) {
        updateData[field] = { increment: numAmount };
      }
    }

    if (Object.keys(updateData).length === 0) {
      // Nothing to update, return current state
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          presentationsCreated: true,
          academicWorksCreated: true,
          academicGenerationsToday: true,
          chatMessagesToday: true,
          dalleImagesUsed: true,
          plagiarismChecksUsed: true,
          dissertationGenerationsUsed: true,
          largeChapterGenerationsUsed: true,
          usageLastResetDate: true,
          usageLastMonthlyReset: true,
        },
      });
      return res.json({ success: true, data: user });
    }

    logger.info(`[USAGE SYNC] POST increments for user ${userId}: ${JSON.stringify(updateData)}`);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        presentationsCreated: true,
        academicWorksCreated: true,
        academicGenerationsToday: true,
        chatMessagesToday: true,
        dalleImagesUsed: true,
        plagiarismChecksUsed: true,
        dissertationGenerationsUsed: true,
        largeChapterGenerationsUsed: true,
        usageLastResetDate: true,
        usageLastMonthlyReset: true,
      },
    });

    res.json({
      success: true,
      data: {
        presentationsCreated: updatedUser.presentationsCreated,
        academicWorksCreated: updatedUser.academicWorksCreated,
        academicGenerationsToday: updatedUser.academicGenerationsToday,
        chatMessagesToday: updatedUser.chatMessagesToday,
        dalleImagesUsed: updatedUser.dalleImagesUsed,
        plagiarismChecksUsed: updatedUser.plagiarismChecksUsed,
        dissertationGenerationsUsed: updatedUser.dissertationGenerationsUsed,
        largeChapterGenerationsUsed: updatedUser.largeChapterGenerationsUsed,
        lastResetDate: updatedUser.usageLastResetDate?.toISOString(),
        lastMonthlyReset: updatedUser.usageLastMonthlyReset?.toISOString(),
      },
    });
  } catch (error: unknown) {
    logger.error(`[USAGE SYNC] POST error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({ success: false, message: 'Failed to sync usage data' });
  }
});

/**
 * Increment a specific usage counter
 * POST /api/usage/increment
 */
router.post('/increment', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { field, amount = 1 } = req.body;

    const validFields = [
      'presentationsCreated',
      'academicWorksCreated',
      'academicGenerationsToday',
      'chatMessagesToday',
      'dalleImagesUsed',
      'plagiarismChecksUsed',
      'dissertationGenerationsUsed',
      'largeChapterGenerationsUsed',
    ];

    if (!field || !validFields.includes(field)) {
      return res.status(400).json({ success: false, message: `Invalid field. Valid: ${validFields.join(', ')}` });
    }

    // Get current value
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { [field]: true },
    });
    
    const currentValue = (currentUser as Record<string, number>)?.[field] || 0;
    const newValue = currentValue + amount;

    logger.info(`[USAGE INCREMENT] ${field}: ${currentValue} → ${newValue} for user ${userId}`);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { [field]: newValue },
      select: { [field]: true },
    });

    res.json({
      success: true,
      data: {
        field,
        previousValue: currentValue,
        newValue: (updatedUser as Record<string, number>)[field],
      },
    });
  } catch (error: unknown) {
    logger.error(`[USAGE INCREMENT] error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({ success: false, message: 'Failed to increment usage' });
  }
});

/**
 * Reset daily counters (called at midnight or on new day)
 * POST /api/usage/reset-daily
 */
router.post('/reset-daily', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    logger.info(`[USAGE RESET] Daily reset for user ${userId}`);

    await prisma.user.update({
      where: { id: userId },
      data: {
        academicGenerationsToday: 0,
        chatMessagesToday: 0,
        usageLastResetDate: new Date(),
      },
    });

    res.json({ success: true, message: 'Daily counters reset' });
  } catch (error: unknown) {
    logger.error(`[USAGE RESET] error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({ success: false, message: 'Failed to reset daily counters' });
  }
});

/**
 * Reset monthly counters
 * POST /api/usage/reset-monthly
 */
router.post('/reset-monthly', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    logger.info(`[USAGE RESET] Monthly reset for user ${userId}`);

    await prisma.user.update({
      where: { id: userId },
      data: {
        presentationsCreated: 0,
        academicWorksCreated: 0,
        academicGenerationsToday: 0,
        chatMessagesToday: 0,
        dalleImagesUsed: 0,
        plagiarismChecksUsed: 0,
        dissertationGenerationsUsed: 0,
        largeChapterGenerationsUsed: 0,
        usageLastResetDate: new Date(),
        usageLastMonthlyReset: new Date(),
      },
    });

    res.json({ success: true, message: 'Monthly counters reset' });
  } catch (error: unknown) {
    logger.error(`[USAGE RESET] error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({ success: false, message: 'Failed to reset monthly counters' });
  }
});

export default router;
