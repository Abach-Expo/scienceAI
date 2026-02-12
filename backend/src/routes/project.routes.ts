import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Create new project
router.post(
  '/',
  [
    body('title').trim().notEmpty(),
    body('type').optional().isIn(['THESIS', 'DISSERTATION', 'RESEARCH_PAPER', 'ARTICLE', 'REVIEW']),
    body('description').optional().trim()
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { title, description, type } = req.body;

      const project = await prisma.project.create({
        data: {
          title,
          description,
          type: type || 'THESIS',
          userId: req.userId!
        },
        include: {
          _count: {
            select: {
              documents: true,
              references: true
            }
          }
        }
      });

      // Create initial analytics record
      await prisma.analytics.create({
        data: {
          projectId: project.id
        }
      });

      res.status(201).json({ success: true, data: project });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create project'
      });
    }
  }
);

// Get all projects for user
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, type, search } = req.query;

    const projects = await prisma.project.findMany({
      where: {
        userId: req.userId,
        ...(status && { status: status as string }),
        ...(type && { type: type as string }),
        ...(search && {
          OR: [
            { title: { contains: search as string } },
            { description: { contains: search as string } }
          ]
        })
      },
      include: {
        _count: {
          select: {
            documents: true,
            references: true,
            outlines: true
          }
        },
        analytics: {
          orderBy: { date: 'desc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects'
    });
  }
});

// Get single project
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await prisma.project.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      },
      include: {
        documents: {
          orderBy: { version: 'desc' },
          take: 5
        },
        outlines: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        references: true,
        analytics: {
          orderBy: { date: 'desc' },
          take: 30
        }
      }
    });

    if (!project) {
      res.status(404).json({
        success: false,
        message: 'Project not found'
      });
      return;
    }

    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project'
    });
  }
});

// Update project
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, status, type } = req.body;

    const project = await prisma.project.updateMany({
      where: {
        id: req.params.id,
        userId: req.userId
      },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(status && { status }),
        ...(type && { type })
      }
    });

    if (project.count === 0) {
      res.status(404).json({
        success: false,
        message: 'Project not found'
      });
      return;
    }

    const updatedProject = await prisma.project.findUnique({
      where: { id: req.params.id }
    });

    res.json({ success: true, data: updatedProject });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update project'
    });
  }
});

// Delete project
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await prisma.project.deleteMany({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (project.count === 0) {
      res.status(404).json({
        success: false,
        message: 'Project not found'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete project'
    });
  }
});

export default router;
