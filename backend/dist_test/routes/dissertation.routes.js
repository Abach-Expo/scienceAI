"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_middleware_1 = require("../middleware/auth.middleware");
const dissertation_service_1 = require("../services/dissertation.service");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
let _dissertationService = null;
function getDissertationService() {
    if (!_dissertationService)
        _dissertationService = new dissertation_service_1.DissertationService();
    return _dissertationService;
}
// ==================== SSE: Генерация полной работы ====================
// POST /api/dissertation/generate
// Стримит прогресс через Server-Sent Events, возвращает полный документ в конце
router.post('/generate', auth_middleware_1.authMiddleware, [
    (0, express_validator_1.body)('topic').trim().notEmpty().withMessage('Тема обязательна'),
    (0, express_validator_1.body)('type').isIn(['essay', 'referat', 'coursework', 'diploma', 'dissertation']).withMessage('Неверный тип работы'),
    (0, express_validator_1.body)('targetPages').isInt({ min: 3, max: 200 }).withMessage('Количество страниц: 3-200'),
    (0, express_validator_1.body)('language').optional().isIn(['ru', 'en', 'uk', 'kk', 'uz', 'de', 'fr', 'es', 'zh', 'ar']),
    (0, express_validator_1.body)('additionalInstructions').optional().trim(),
    (0, express_validator_1.body)('style').optional().isIn(['academic', 'scientific', 'popular']),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ success: false, errors: errors.array() });
            return;
        }
        const { topic, type, targetPages, language = 'ru', additionalInstructions, includeReferences = true, includeTableOfContents = true, style = 'academic', } = req.body;
        logger_1.logger.info(`[Dissertation Route] Generate request: "${topic}", ${targetPages} pages, type=${type}`);
        // Настройка SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('X-Accel-Buffering', 'no'); // Для nginx
        // Обработка отключения клиента — прекращаем генерацию
        let clientDisconnected = false;
        req.on('close', () => { clientDisconnected = true; });
        // Отправка прогресса через SSE
        const sendProgress = (progress) => {
            if (clientDisconnected)
                throw new Error('Client disconnected');
            res.write(`data: ${JSON.stringify({ type: 'progress', ...progress })}\n\n`);
        };
        // Генерация
        const result = await getDissertationService().generateFullDissertation({
            topic,
            type,
            targetPages: parseInt(targetPages),
            language,
            additionalInstructions,
            includeReferences,
            includeTableOfContents,
            style,
        }, sendProgress);
        // Отправляем финальный результат
        res.write(`data: ${JSON.stringify({ type: 'result', ...result })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();
    }
    catch (error) {
        logger_1.logger.error('[Dissertation Route] Generation error:', error);
        // Если SSE уже начался, отправляем ошибку через SSE
        if (res.headersSent) {
            res.write(`data: ${JSON.stringify({ type: 'error', message: 'Ошибка генерации' })}\n\n`);
            res.end();
        }
        else {
            res.status(500).json({
                success: false,
                message: 'Ошибка генерации работы',
            });
        }
    }
});
// ==================== Оценка времени и стоимости ====================
// POST /api/dissertation/estimate
router.post('/estimate', auth_middleware_1.authMiddleware, [
    (0, express_validator_1.body)('targetPages').isInt({ min: 3, max: 200 }),
    (0, express_validator_1.body)('type').isIn(['essay', 'referat', 'coursework', 'diploma', 'dissertation']),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ success: false, errors: errors.array() });
            return;
        }
        const { targetPages } = req.body;
        const estimate = getDissertationService().estimateGenerationTime(parseInt(targetPages));
        res.json({
            success: true,
            data: {
                targetPages: parseInt(targetPages),
                ...estimate,
                wordsEstimate: parseInt(targetPages) * 280,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('[Dissertation Route] Estimate error:', error);
        res.status(500).json({ success: false, message: 'Ошибка оценки' });
    }
});
exports.default = router;
//# sourceMappingURL=dissertation.routes.js.map