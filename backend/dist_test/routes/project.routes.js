"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const index_1 = require("../index");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Apply auth middleware to all routes
router.use(auth_middleware_1.authMiddleware);
// Create new project
router.post('/', [
    (0, express_validator_1.body)('title').trim().notEmpty(),
    (0, express_validator_1.body)('type').optional().isIn(['THESIS', 'DISSERTATION', 'RESEARCH_PAPER', 'ARTICLE', 'REVIEW']),
    (0, express_validator_1.body)('description').optional().trim()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ success: false, errors: errors.array() });
            return;
        }
        const { title, description, type } = req.body;
        const project = await index_1.prisma.project.create({
            data: {
                title,
                description,
                type: type || 'THESIS',
                userId: req.userId
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
        await index_1.prisma.analytics.create({
            data: {
                projectId: project.id
            }
        });
        res.status(201).json({ success: true, data: project });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create project'
        });
    }
});
// Get all projects for user
router.get('/', async (req, res) => {
    try {
        const { status, type, search } = req.query;
        const projects = await index_1.prisma.project.findMany({
            where: {
                userId: req.userId,
                ...(status && { status: status }),
                ...(type && { type: type }),
                ...(search && {
                    OR: [
                        { title: { contains: search } },
                        { description: { contains: search } }
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch projects'
        });
    }
});
// Get single project
router.get('/:id', async (req, res) => {
    try {
        const project = await index_1.prisma.project.findFirst({
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch project'
        });
    }
});
// Update project
router.put('/:id', async (req, res) => {
    try {
        const { title, description, status, type } = req.body;
        const project = await index_1.prisma.project.updateMany({
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
        const updatedProject = await index_1.prisma.project.findUnique({
            where: { id: req.params.id }
        });
        res.json({ success: true, data: updatedProject });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update project'
        });
    }
});
// Delete project
router.delete('/:id', async (req, res) => {
    try {
        const project = await index_1.prisma.project.deleteMany({
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete project'
        });
    }
});
exports.default = router;
//# sourceMappingURL=project.routes.js.map