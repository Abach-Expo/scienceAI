import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

const router = Router();

// ==========================================
// DISSERTATIONS STORAGE
// ==========================================

// Save dissertation
router.post('/dissertations', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { 
      id, // Optional - for updates
      title, 
      documentType, 
      scienceField, 
      abstract, 
      chapters, 
      citations,
      uniquenessScore,
      wordCount,
      pageCount,
      gostFormat 
    } = req.body;

    if (id) {
      // Update existing
      const existing = await prisma.savedDissertation.findFirst({
        where: { id, userId }
      });

      if (!existing) {
        return res.status(404).json({ error: 'Dissertation not found' });
      }

      const updated = await prisma.savedDissertation.update({
        where: { id },
        data: {
          title,
          documentType,
          scienceField,
          abstract,
          chapters: JSON.stringify(chapters),
          citations: JSON.stringify(citations || []),
          uniquenessScore,
          wordCount,
          pageCount,
          gostFormat,
          updatedAt: new Date()
        }
      });

      return res.json({ success: true, dissertation: updated });
    } else {
      // Create new
      const created = await prisma.savedDissertation.create({
        data: {
          userId,
          title,
          documentType: documentType || 'dissertation',
          scienceField,
          abstract,
          chapters: JSON.stringify(chapters || []),
          citations: JSON.stringify(citations || []),
          uniquenessScore,
          wordCount: wordCount || 0,
          pageCount: pageCount || 0,
          gostFormat: gostFormat || 'GOST_R_7_0_11_2011'
        }
      });

      return res.json({ success: true, dissertation: created });
    }
  } catch (error: unknown) {
    logger.error('Save dissertation error:', error);
    return res.status(500).json({ error: 'Failed to save dissertation' });
  }
});

// Get all user's dissertations
router.get('/dissertations', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const dissertations = await prisma.savedDissertation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        documentType: true,
        scienceField: true,
        wordCount: true,
        pageCount: true,
        uniquenessScore: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return res.json({ dissertations });
  } catch (error: unknown) {
    logger.error('Get dissertations error:', error);
    return res.status(500).json({ error: 'Failed to get dissertations' });
  }
});

// Get single dissertation by ID
router.get('/dissertations/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const dissertation = await prisma.savedDissertation.findFirst({
      where: { id, userId }
    });

    if (!dissertation) {
      return res.status(404).json({ error: 'Dissertation not found' });
    }

    // Parse JSON fields
    const result = {
      ...dissertation,
      chapters: JSON.parse(dissertation.chapters || '[]'),
      citations: JSON.parse(dissertation.citations || '[]')
    };

    return res.json({ dissertation: result });
  } catch (error: unknown) {
    logger.error('Get dissertation error:', error);
    return res.status(500).json({ error: 'Failed to get dissertation' });
  }
});

// Delete dissertation
router.delete('/dissertations/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const existing = await prisma.savedDissertation.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Dissertation not found' });
    }

    await prisma.savedDissertation.delete({
      where: { id }
    });

    return res.json({ success: true });
  } catch (error: unknown) {
    logger.error('Delete dissertation error:', error);
    return res.status(500).json({ error: 'Failed to delete dissertation' });
  }
});

// ==========================================
// PRESENTATIONS STORAGE
// ==========================================

// Save presentation
router.post('/presentations', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { 
      id, // Optional - for updates
      title, 
      topic, 
      slides, 
      theme,
      slideCount,
      hasImages
    } = req.body;

    if (id) {
      // Update existing
      const existing = await prisma.savedPresentation.findFirst({
        where: { id, userId }
      });

      if (!existing) {
        return res.status(404).json({ error: 'Presentation not found' });
      }

      const updated = await prisma.savedPresentation.update({
        where: { id },
        data: {
          title,
          topic,
          slides: JSON.stringify(slides),
          theme,
          slideCount: slideCount || slides?.length || 0,
          hasImages: hasImages || false,
          updatedAt: new Date()
        }
      });

      return res.json({ success: true, presentation: updated });
    } else {
      // Create new
      const created = await prisma.savedPresentation.create({
        data: {
          userId,
          title,
          topic,
          slides: JSON.stringify(slides || []),
          theme: theme || 'modern',
          slideCount: slideCount || slides?.length || 0,
          hasImages: hasImages || false
        }
      });

      return res.json({ success: true, presentation: created });
    }
  } catch (error: unknown) {
    logger.error('Save presentation error:', error);
    return res.status(500).json({ error: 'Failed to save presentation' });
  }
});

// Get all user's presentations
router.get('/presentations', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const presentations = await prisma.savedPresentation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        topic: true,
        theme: true,
        slideCount: true,
        hasImages: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return res.json({ presentations });
  } catch (error: unknown) {
    logger.error('Get presentations error:', error);
    return res.status(500).json({ error: 'Failed to get presentations' });
  }
});

// Get single presentation by ID
router.get('/presentations/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const presentation = await prisma.savedPresentation.findFirst({
      where: { id, userId }
    });

    if (!presentation) {
      return res.status(404).json({ error: 'Presentation not found' });
    }

    // Parse JSON fields
    const result = {
      ...presentation,
      slides: JSON.parse(presentation.slides || '[]')
    };

    return res.json({ presentation: result });
  } catch (error: unknown) {
    logger.error('Get presentation error:', error);
    return res.status(500).json({ error: 'Failed to get presentation' });
  }
});

// Delete presentation
router.delete('/presentations/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const existing = await prisma.savedPresentation.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Presentation not found' });
    }

    await prisma.savedPresentation.delete({
      where: { id }
    });

    return res.json({ success: true });
  } catch (error: unknown) {
    logger.error('Delete presentation error:', error);
    return res.status(500).json({ error: 'Failed to delete presentation' });
  }
});

// ==========================================
// USER DATA SYNC
// ==========================================

// Get all user data (for sync)
router.get('/sync', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const [dissertations, presentations] = await Promise.all([
      prisma.savedDissertation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.savedPresentation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' }
      })
    ]);

    // Parse JSON fields
    const parsedDissertations = dissertations.map((d: Record<string, unknown>) => ({
      ...d,
      chapters: JSON.parse((d.chapters as string) || '[]'),
      citations: JSON.parse((d.citations as string) || '[]')
    }));

    const parsedPresentations = presentations.map((p: Record<string, unknown>) => ({
      ...p,
      slides: JSON.parse((p.slides as string) || '[]')
    }));

    return res.json({
      dissertations: parsedDissertations,
      presentations: parsedPresentations,
      lastSync: new Date().toISOString()
    });
  } catch (error: unknown) {
    logger.error('Sync error:', error);
    return res.status(500).json({ error: 'Failed to sync data' });
  }
});

export default router;
