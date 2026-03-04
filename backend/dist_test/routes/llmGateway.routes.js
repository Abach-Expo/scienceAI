"use strict";
// =================================================================
// 🧠 SCIENCE AI — LLM GATEWAY ROUTES
// /api/llm/* — единый API для всех AI-запросов с сайта
// =================================================================
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const logger_1 = require("../utils/logger");
const auth_middleware_1 = require("../middleware/auth.middleware");
const usage_middleware_1 = require("../middleware/usage.middleware");
const llmGateway_service_1 = require("../services/llmGateway.service");
const router = (0, express_1.Router)();
// ==================== PROMPT INJECTION PROTECTION ====================
const INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /ignore\s+(all\s+)?above\s+instructions/i,
    /disregard\s+(all\s+)?previous/i,
    /forget\s+(all\s+)?previous/i,
    /you\s+are\s+now\s+(a|an)\s+/i,
    /new\s+instructions?\s*:/i,
    /system\s*:\s*/i,
    /\[SYSTEM\]/i,
    /\[INST\]/i,
    /<<SYS>>/i,
    /pretend\s+you\s+are/i,
    /override\s+(your\s+)?instructions/i,
    /jailbreak/i,
    /DAN\s*mode/i,
    /you\s+are\s+chatgpt|you\s+are\s+gpt|you\s+are\s+claude/i,
    /reveal\s+(your\s+)?system\s*prompt/i,
    /show\s+(your\s+)?instructions/i,
];
function sanitizeInput(input) {
    let sanitized = input;
    for (const pattern of INJECTION_PATTERNS) {
        sanitized = sanitized.replace(pattern, '[filtered]');
    }
    if (sanitized.length > 50000) {
        sanitized = sanitized.slice(0, 50000) + '\n[truncated]';
    }
    return sanitized;
}
// ==================== MIDDLEWARE ====================
// Auth + Usage limits для всех endpoints
router.use(auth_middleware_1.authMiddleware);
router.use(usage_middleware_1.checkUsageLimits);
// ==================== POST /api/llm/chat ====================
// Основной endpoint для чат-запросов с историей
router.post('/chat', [
    (0, express_validator_1.body)('message').trim().notEmpty().withMessage('message is required'),
    (0, express_validator_1.body)('taskType').optional().isString(),
    (0, express_validator_1.body)('conversationHistory').optional().isArray(),
    (0, express_validator_1.body)('options').optional().isObject(),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ success: false, errors: errors.array() });
            return;
        }
        const { message, taskType, conversationHistory, options } = req.body;
        const gateway = (0, llmGateway_service_1.getLLMGateway)();
        const request = {
            taskType: taskType || 'chat',
            userPrompt: sanitizeInput(message),
            conversationHistory: conversationHistory?.map((m) => ({
                role: m.role,
                content: sanitizeInput(m.content || ''),
            })),
            options: {
                temperature: options?.temperature,
                maxTokens: options?.maxTokens,
                language: options?.language,
                provider: options?.provider,
                jsonMode: options?.jsonMode,
            },
        };
        const result = await gateway.generate(request);
        // Записываем использование
        const userId = req.userId;
        if (userId) {
            await (0, usage_middleware_1.recordUsage)(userId, result.usage.totalTokens, 'llm_chat', { taskType: taskType || 'chat' }, result._model);
        }
        res.json({
            success: true,
            content: result.content,
            model: result.model, // "Science AI"
            usage: result.usage,
            latencyMs: result.latencyMs,
        });
    }
    catch (error) {
        logger_1.logger.error('[LLM Chat] Error:', error instanceof Error ? error.message : 'Unknown');
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Ошибка генерации. Попробуйте позже.',
        });
    }
});
// ==================== POST /api/llm/generate ====================
// Генерация с кастомным системным промптом (для презентаций, диссертаций и т.д.)
router.post('/generate', [
    (0, express_validator_1.body)('userPrompt').trim().notEmpty().withMessage('userPrompt is required'),
    (0, express_validator_1.body)('systemPrompt').optional().isString(),
    (0, express_validator_1.body)('taskType').optional().isString(),
    (0, express_validator_1.body)('temperature').optional().isFloat({ min: 0, max: 2 }),
    (0, express_validator_1.body)('maxTokens').optional().isInt({ min: 1, max: 64000 }),
    (0, express_validator_1.body)('options').optional().isObject(),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ success: false, errors: errors.array() });
            return;
        }
        // Backward-compatible: accept temperature/maxTokens at top-level OR inside options
        const { userPrompt, systemPrompt, taskType, options, temperature, maxTokens } = req.body;
        const gateway = (0, llmGateway_service_1.getLLMGateway)();
        const request = {
            taskType: taskType || 'chat',
            userPrompt: sanitizeInput(userPrompt),
            systemPrompt: systemPrompt, // Кастомный промпт дополняет базовый
            options: {
                temperature: options?.temperature ?? temperature,
                maxTokens: options?.maxTokens ?? maxTokens,
                language: options?.language,
                provider: options?.provider,
                model: options?.model,
                jsonMode: options?.jsonMode,
            },
        };
        const result = await gateway.generate(request);
        // Записываем использование
        const userId = req.userId;
        if (userId) {
            await (0, usage_middleware_1.recordUsage)(userId, result.usage.totalTokens, 'llm_generate', { taskType: taskType || 'generate' }, result._model);
        }
        res.json({
            success: true,
            content: result.content,
            model: result.model, // "Science AI"
            usage: result.usage,
            latencyMs: result.latencyMs,
        });
    }
    catch (error) {
        logger_1.logger.error('[LLM Generate] Error:', error instanceof Error ? error.message : 'Unknown');
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Ошибка генерации. Попробуйте позже.',
        });
    }
});
// ==================== POST /api/llm/stream ====================
// SSE streaming для чата в реальном времени
router.post('/stream', [
    // Accept both 'message' and 'userPrompt' for backward compat
    (0, express_validator_1.body)('message').optional().isString(),
    (0, express_validator_1.body)('userPrompt').optional().isString(),
    (0, express_validator_1.body)('systemPrompt').optional().isString(),
    (0, express_validator_1.body)('taskType').optional().isString(),
    (0, express_validator_1.body)('temperature').optional().isFloat({ min: 0, max: 2 }),
    (0, express_validator_1.body)('maxTokens').optional().isInt({ min: 1, max: 64000 }),
    (0, express_validator_1.body)('conversationHistory').optional().isArray(),
    (0, express_validator_1.body)('options').optional().isObject(),
], async (req, res) => {
    try {
        // Custom validation: need either message or userPrompt
        const { message, userPrompt, systemPrompt, taskType, conversationHistory, options, temperature, maxTokens } = req.body;
        const actualMessage = message || userPrompt;
        if (!actualMessage || !actualMessage.trim()) {
            res.status(400).json({ success: false, errors: [{ msg: 'message or userPrompt is required' }] });
            return;
        }
        // SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.flushHeaders();
        // Initial heartbeat (matches old /ai/generate-stream behavior)
        res.write(`data: ${JSON.stringify({ content: '', done: false, status: 'connected' })}\n\n`);
        const gateway = (0, llmGateway_service_1.getLLMGateway)();
        const request = {
            taskType: taskType || 'chat',
            userPrompt: sanitizeInput(actualMessage),
            systemPrompt: systemPrompt,
            conversationHistory: conversationHistory?.map((m) => ({
                role: m.role,
                content: sanitizeInput(m.content || ''),
            })),
            options: {
                temperature: options?.temperature ?? temperature,
                maxTokens: options?.maxTokens ?? maxTokens,
                language: options?.language,
                provider: options?.provider,
                stream: true,
            },
        };
        let totalContent = '';
        for await (const chunk of gateway.generateStream(request)) {
            if (chunk.content) {
                totalContent += chunk.content;
                res.write(`data: ${JSON.stringify({ content: chunk.content, done: false })}\n\n`);
            }
            if (chunk.done) {
                // Send fullContent for backward compat with ChatPage/DissertationPage
                res.write(`data: ${JSON.stringify({ content: '', done: true, fullContent: totalContent, model: 'Science AI' })}\n\n`);
            }
        }
        // Записываем использование (приблизительно)
        const userId = req.userId;
        if (userId) {
            const approxTokens = Math.ceil(totalContent.length / 4);
            await (0, usage_middleware_1.recordUsage)(userId, approxTokens, 'llm_stream', { taskType: taskType || 'chat' }, 'stream');
        }
        res.end();
    }
    catch (error) {
        logger_1.logger.error('[LLM Stream] Error:', error instanceof Error ? error.message : 'Unknown');
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: 'Ошибка стриминга. Попробуйте позже.',
            });
        }
        else {
            res.write(`data: ${JSON.stringify({ error: 'Stream error', done: true })}\n\n`);
            res.end();
        }
    }
});
// ==================== GET /api/llm/status ====================
// Статус Gateway и доступных провайдеров
router.get('/status', async (_req, res) => {
    try {
        const gateway = (0, llmGateway_service_1.getLLMGateway)();
        const status = gateway.getStatus();
        res.json({
            success: true,
            gateway: 'Science AI LLM Gateway',
            version: '1.0.0',
            ...status,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Gateway status unavailable' });
    }
});
// ==================== GET /api/llm/models ====================
// Список доступных "моделей" Science AI (маппинг на реальные)
router.get('/models', async (_req, res) => {
    const gateway = (0, llmGateway_service_1.getLLMGateway)();
    const status = gateway.getStatus();
    res.json({
        success: true,
        models: [
            {
                id: 'science-ai-pro',
                name: 'Science AI Pro',
                description: 'Best quality for academic work, presentations, and analysis',
                capabilities: ['text', 'analysis', 'code', 'json'],
            },
            {
                id: 'science-ai-fast',
                name: 'Science AI Fast',
                description: 'Quick responses for chat and simple tasks',
                capabilities: ['text', 'chat'],
            },
            {
                id: 'science-ai-creative',
                name: 'Science AI Creative',
                description: 'Creative writing, humanization, style improvement',
                capabilities: ['text', 'creative'],
            },
        ],
        providers: status.totalProviders,
    });
});
exports.default = router;
//# sourceMappingURL=llmGateway.routes.js.map