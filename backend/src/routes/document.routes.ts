import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

// Create new document
router.post(
  '/',
  [
    body('title').trim().notEmpty(),
    body('content').trim().notEmpty(),
    body('projectId').notEmpty(),
    body('type').optional().isIn(['DRAFT', 'OUTLINE', 'CHAPTER', 'ABSTRACT', 'CONCLUSION', 'FINAL'])
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { title, content, projectId, type, parentId } = req.body;

      // Verify project ownership
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: req.userId }
      });

      if (!project) {
        res.status(404).json({
          success: false,
          message: 'Project not found'
        });
        return;
      }

      // Get latest version number if parentId provided
      let version = 1;
      if (parentId) {
        const parent = await prisma.document.findUnique({
          where: { id: parentId }
        });
        if (parent) {
          version = parent.version + 1;
        }
      }

      const document = await prisma.document.create({
        data: {
          title,
          content,
          version,
          type: type || 'DRAFT',
          projectId,
          userId: req.userId!,
          parentId
        }
      });

      // Update analytics
      const wordCount = content.split(/\s+/).filter(Boolean).length;
      await prisma.analytics.create({
        data: {
          projectId,
          wordCount,
          sectionCount: 1
        }
      });

      res.status(201).json({ success: true, data: document });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create document'
      });
    }
  }
);

// Get documents for a project
router.get('/project/:projectId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type } = req.query;

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: req.params.projectId, userId: req.userId }
    });

    if (!project) {
      res.status(404).json({
        success: false,
        message: 'Project not found'
      });
      return;
    }

    const documents = await prisma.document.findMany({
      where: {
        projectId: req.params.projectId,
        ...(type && { type: type as string })
      },
      include: {
        _count: {
          select: { aiAnalysis: true }
        }
      },
      orderBy: [
        { updatedAt: 'desc' },
        { version: 'desc' }
      ]
    });

    res.json({ success: true, data: documents });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents'
    });
  }
});

// Get single document
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const document = await prisma.document.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      },
      include: {
        aiAnalysis: {
          orderBy: { createdAt: 'desc' }
        },
        children: {
          select: { id: true, version: true, createdAt: true }
        },
        parent: {
          select: { id: true, version: true }
        }
      }
    });

    if (!document) {
      res.status(404).json({
        success: false,
        message: 'Document not found'
      });
      return;
    }

    res.json({ success: true, data: document });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document'
    });
  }
});

// Update document (creates new version)
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, content, type, createNewVersion } = req.body;

    const existingDoc = await prisma.document.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!existingDoc) {
      res.status(404).json({
        success: false,
        message: 'Document not found'
      });
      return;
    }

    let document;

    if (createNewVersion) {
      // Create new version linked to parent
      document = await prisma.document.create({
        data: {
          title: title || existingDoc.title,
          content: content || existingDoc.content,
          version: existingDoc.version + 1,
          type: type || existingDoc.type,
          projectId: existingDoc.projectId,
          userId: req.userId!,
          parentId: existingDoc.id
        }
      });
    } else {
      // Update in place
      document = await prisma.document.update({
        where: { id: req.params.id },
        data: {
          ...(title && { title }),
          ...(content && { content }),
          ...(type && { type })
        }
      });
    }

    res.json({ success: true, data: document });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update document'
    });
  }
});

// Delete document
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const document = await prisma.document.deleteMany({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (document.count === 0) {
      res.status(404).json({
        success: false,
        message: 'Document not found'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete document'
    });
  }
});

// Get document version history
router.get('/:id/history', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const document = await prisma.document.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!document) {
      res.status(404).json({
        success: false,
        message: 'Document not found'
      });
      return;
    }

    // Get all versions in the chain
    const allVersions = await prisma.document.findMany({
      where: {
        projectId: document.projectId,
        title: document.title
      },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        title: true,
        version: true,
        type: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ success: true, data: allVersions });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document history'
    });
  }
});

export default router;
