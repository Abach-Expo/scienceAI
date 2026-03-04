"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const auth_middleware_1 = require("../middleware/auth.middleware");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// All presentation routes require auth
router.use(auth_middleware_1.authMiddleware);
// ==========================================
// PRESENTATIONS STORAGE
// ==========================================
// GET /api/presentations — List user's saved presentations
router.get('/', async (req, res) => {
    try {
        const userId = req.userId;
        const presentations = await index_1.prisma.savedPresentation.findMany({
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
                updatedAt: true,
            },
        });
        res.json({ success: true, presentations });
    }
    catch (error) {
        logger_1.logger.error('[Presentations] List error:', error);
        res.status(500).json({ success: false, message: 'Ошибка загрузки презентаций' });
    }
});
// GET /api/presentations/:id — Get full presentation
router.get('/:id', async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const presentation = await index_1.prisma.savedPresentation.findFirst({
            where: { id, userId },
        });
        if (!presentation) {
            res.status(404).json({ success: false, message: 'Презентация не найдена' });
            return;
        }
        res.json({
            success: true,
            presentation: {
                ...presentation,
                slides: JSON.parse(presentation.slides),
            },
        });
    }
    catch (error) {
        logger_1.logger.error('[Presentations] Get error:', error);
        res.status(500).json({ success: false, message: 'Ошибка загрузки презентации' });
    }
});
// POST /api/presentations — Create or update a presentation
router.post('/', async (req, res) => {
    try {
        const userId = req.userId;
        const { id, title, topic, slides, theme, slideCount, hasImages } = req.body;
        if (!title || !slides) {
            res.status(400).json({ success: false, message: 'title и slides обязательны' });
            return;
        }
        const slidesJson = typeof slides === 'string' ? slides : JSON.stringify(slides);
        if (id) {
            // Update existing
            const existing = await index_1.prisma.savedPresentation.findFirst({
                where: { id, userId },
            });
            if (!existing) {
                res.status(404).json({ success: false, message: 'Презентация не найдена' });
                return;
            }
            const updated = await index_1.prisma.savedPresentation.update({
                where: { id },
                data: {
                    title,
                    topic: topic || null,
                    slides: slidesJson,
                    theme: theme || 'modern',
                    slideCount: slideCount || 0,
                    hasImages: hasImages || false,
                },
            });
            res.json({ success: true, presentation: { ...updated, slides: JSON.parse(updated.slides) } });
        }
        else {
            // Create new
            const created = await index_1.prisma.savedPresentation.create({
                data: {
                    userId,
                    title,
                    topic: topic || null,
                    slides: slidesJson,
                    theme: theme || 'modern',
                    slideCount: slideCount || 0,
                    hasImages: hasImages || false,
                },
            });
            res.json({ success: true, presentation: { ...created, slides: JSON.parse(created.slides) } });
        }
    }
    catch (error) {
        logger_1.logger.error('[Presentations] Save error:', error);
        res.status(500).json({ success: false, message: 'Ошибка сохранения презентации' });
    }
});
// DELETE /api/presentations/:id — Delete a presentation
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const existing = await index_1.prisma.savedPresentation.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Презентация не найдена' });
            return;
        }
        await index_1.prisma.savedPresentation.delete({ where: { id } });
        res.json({ success: true, message: 'Презентация удалена' });
    }
    catch (error) {
        logger_1.logger.error('[Presentations] Delete error:', error);
        res.status(500).json({ success: false, message: 'Ошибка удаления презентации' });
    }
});
exports.default = router;
//# sourceMappingURL=presentation.routes.js.map