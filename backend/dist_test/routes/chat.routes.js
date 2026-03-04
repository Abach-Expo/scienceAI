"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const index_1 = require("../index");
const auth_middleware_1 = require("../middleware/auth.middleware");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// Get all chats for current user (with pagination)
router.get('/', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;
        const [chats, total] = await Promise.all([
            index_1.prisma.chat.findMany({
                where: { userId: req.userId },
                include: {
                    messages: {
                        orderBy: { createdAt: 'asc' },
                        take: 50, // Limit messages per chat to last 50
                    }
                },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: limit,
            }),
            index_1.prisma.chat.count({ where: { userId: req.userId } }),
        ]);
        res.json({
            success: true,
            data: chats,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch chats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch chats'
        });
    }
});
// Get single chat
router.get('/:id', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const chat = await index_1.prisma.chat.findFirst({
            where: {
                id: req.params.id,
                userId: req.userId
            },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });
        if (!chat) {
            res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
            return;
        }
        res.json({ success: true, data: chat });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch chat'
        });
    }
});
// Create new chat
router.post('/', auth_middleware_1.authMiddleware, [(0, express_validator_1.body)('title').optional().isString()], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ success: false, errors: errors.array() });
            return;
        }
        const { title } = req.body;
        const chat = await index_1.prisma.chat.create({
            data: {
                title: title || 'Новый чат',
                userId: req.userId
            },
            include: {
                messages: true
            }
        });
        res.status(201).json({ success: true, data: chat });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create chat'
        });
    }
});
// Update chat title
router.patch('/:id', auth_middleware_1.authMiddleware, [(0, express_validator_1.body)('title').isString().notEmpty()], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ success: false, errors: errors.array() });
            return;
        }
        const chat = await index_1.prisma.chat.updateMany({
            where: {
                id: req.params.id,
                userId: req.userId
            },
            data: {
                title: req.body.title,
                updatedAt: new Date()
            }
        });
        if (chat.count === 0) {
            res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
            return;
        }
        res.json({ success: true, message: 'Chat updated' });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update chat'
        });
    }
});
// Delete chat
router.delete('/:id', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const chat = await index_1.prisma.chat.deleteMany({
            where: {
                id: req.params.id,
                userId: req.userId
            }
        });
        if (chat.count === 0) {
            res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
            return;
        }
        res.json({ success: true, message: 'Chat deleted' });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete chat'
        });
    }
});
// Add message to chat
router.post('/:id/messages', auth_middleware_1.authMiddleware, [
    (0, express_validator_1.body)('role').isIn(['user', 'assistant']),
    (0, express_validator_1.body)('content').isString().notEmpty(),
    (0, express_validator_1.body)('attachments').optional().isArray()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ success: false, errors: errors.array() });
            return;
        }
        // Check if chat belongs to user
        const chat = await index_1.prisma.chat.findFirst({
            where: {
                id: req.params.id,
                userId: req.userId
            }
        });
        if (!chat) {
            res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
            return;
        }
        const { role, content, attachments } = req.body;
        const message = await index_1.prisma.chatMessage.create({
            data: {
                chatId: req.params.id,
                role,
                content,
                attachments: attachments || null
            }
        });
        // Update chat's updatedAt and title if first message
        const updateData = { updatedAt: new Date() };
        // Auto-title from first user message
        const messageCount = await index_1.prisma.chatMessage.count({
            where: { chatId: req.params.id }
        });
        if (messageCount === 1 && role === 'user') {
            updateData.title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
        }
        await index_1.prisma.chat.update({
            where: { id: req.params.id },
            data: updateData
        });
        res.status(201).json({ success: true, data: message });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to add message'
        });
    }
});
// Sync all chats (upsert - safe merge)
router.post('/sync', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { chats } = req.body;
        if (!Array.isArray(chats)) {
            res.status(400).json({
                success: false,
                message: 'Chats must be an array'
            });
            return;
        }
        // Use transaction for atomicity
        await index_1.prisma.$transaction(async (tx) => {
            for (const chatData of chats) {
                // Upsert chat
                await tx.chat.upsert({
                    where: { id: chatData.id },
                    create: {
                        id: chatData.id,
                        title: chatData.title,
                        userId: req.userId,
                        createdAt: new Date(chatData.createdAt),
                        updatedAt: new Date(chatData.updatedAt),
                    },
                    update: {
                        title: chatData.title,
                        updatedAt: new Date(chatData.updatedAt),
                    },
                });
                // Upsert messages
                if (Array.isArray(chatData.messages)) {
                    for (const msg of chatData.messages) {
                        await tx.chatMessage.upsert({
                            where: { id: msg.id },
                            create: {
                                id: msg.id,
                                chatId: chatData.id,
                                role: msg.role,
                                content: msg.content,
                                attachments: msg.attachments || null,
                                createdAt: new Date(msg.timestamp || msg.createdAt),
                            },
                            update: {
                                content: msg.content,
                                attachments: msg.attachments || null,
                            },
                        });
                    }
                }
            }
        });
        res.json({ success: true, message: 'Chats synced successfully' });
    }
    catch (error) {
        logger_1.logger.error('Sync error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to sync chats'
        });
    }
});
exports.default = router;
//# sourceMappingURL=chat.routes.js.map