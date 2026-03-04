"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const logger_1 = require("../utils/logger");
const index_1 = require("../index");
const auth_middleware_1 = require("../middleware/auth.middleware");
const usage_middleware_1 = require("../middleware/usage.middleware");
const ai_service_1 = require("../services/ai.service");
const plagiarism_service_1 = require("../services/plagiarism.service");
const openai_1 = __importDefault(require("openai"));
const router = (0, express_1.Router)();
let _aiService = null;
function getAIService() {
    if (!_aiService)
        _aiService = new ai_service_1.AIService();
    return _aiService;
}
// Серверный API ключ из .env (БЕЗОПАСНО - не виден клиенту)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
// Singleton OpenAI client (reused across requests)
let _openaiClient = null;
function getOpenAIClient() {
    if (!_openaiClient && OPENAI_API_KEY) {
        _openaiClient = new openai_1.default({ apiKey: OPENAI_API_KEY });
    }
    if (!_openaiClient) {
        throw new Error('OpenAI API key is not configured');
    }
    return _openaiClient;
}
const MODELS = {
    'gpt-4o': { name: 'gpt-4o', maxTokens: 16384, costPer1kTokens: 0.01, quality: 'highest' },
    'gpt-4o-mini': { name: 'gpt-4o-mini', maxTokens: 16384, costPer1kTokens: 0.00015, quality: 'high' },
    'claude-sonnet': { name: 'claude-sonnet-4-20250514', maxTokens: 64000, costPer1kTokens: 0.015, quality: 'highest' },
    'gpt-3.5-turbo': { name: 'gpt-3.5-turbo', maxTokens: 4096, costPer1kTokens: 0.0005, quality: 'good' },
};
const MODEL_FALLBACK_ORDER = ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'];
// ================== УМНЫЙ ВЫБОР МОДЕЛИ ==================
function selectOptimalModel(params) {
    const { maxTokens, useHighQuality = true } = params;
    // Для длинных ответов или высокого качества - GPT-4o
    if (maxTokens > 8000 || useHighQuality) {
        return 'gpt-4o';
    }
    // Для обычных запросов - gpt-4o-mini (быстрее и дешевле)
    return 'gpt-4o-mini';
}
async function generateWithFallback(openai, options) {
    const { systemPrompt, userPrompt, temperature = 0.85, maxTokens = 4000, model, enableFallback = true, maxRetries = 2, } = options;
    const modelsToTry = model
        ? [model, ...(enableFallback ? MODEL_FALLBACK_ORDER.filter(m => m !== model) : [])]
        : MODEL_FALLBACK_ORDER;
    let lastError = null;
    for (const currentModel of modelsToTry) {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                logger_1.logger.debug(`[AI] Trying ${currentModel}, attempt ${attempt + 1}/${maxRetries + 1}`);
                const modelConfig = MODELS[currentModel] || MODELS['gpt-4o'];
                const effectiveMaxTokens = Math.min(maxTokens, modelConfig.maxTokens);
                const response = await openai.chat.completions.create({
                    model: currentModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: temperature + (attempt * 0.02), // Немного увеличиваем при retry
                    max_tokens: effectiveMaxTokens,
                    presence_penalty: 0.6, // Уменьшает повторение тем
                    frequency_penalty: 0.4, // Уменьшает повторение слов
                });
                const content = response.choices[0]?.message?.content || '';
                if (!content || content.length < 10) {
                    throw new Error('Empty or too short response');
                }
                logger_1.logger.info(`[AI] Success with ${currentModel}, ${content.length} chars`);
                return {
                    content,
                    model: currentModel,
                    usage: response.usage
                };
            }
            catch (error) {
                lastError = error;
                const errMsg = error instanceof Error ? error.message : 'Unknown error';
                const errCode = error.code;
                logger_1.logger.error(`[AI] Error with ${currentModel}, attempt ${attempt + 1}:`, errMsg);
                // Rate limit - ждём и пробуем снова
                if (errCode === 'rate_limit_exceeded') {
                    const waitTime = Math.pow(2, attempt + 1) * 1000;
                    logger_1.logger.warn(`[AI] Rate limited, waiting ${waitTime}ms...`);
                    await new Promise(r => setTimeout(r, waitTime));
                    if (attempt === maxRetries) {
                        // Переходим к следующей модели
                        break;
                    }
                    continue;
                }
                // Другие ошибки - сразу пробуем следующую модель
                if (errCode === 'model_not_found' || errCode === 'context_length_exceeded') {
                    break;
                }
                // Небольшая пауза перед retry
                if (attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
                }
            }
        }
    }
    throw lastError || new Error('All models failed');
}
// ================== PROMPT INJECTION PROTECTION ==================
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
    /act\s+as\s+if\s+you/i,
    /override\s+(your\s+)?instructions/i,
    /jailbreak/i,
    /DAN\s*mode/i,
];
function sanitizeUserInput(input) {
    let sanitized = input;
    for (const pattern of INJECTION_PATTERNS) {
        sanitized = sanitized.replace(pattern, '[filtered]');
    }
    // Limit input length to prevent token abuse
    if (sanitized.length > 50000) {
        sanitized = sanitized.slice(0, 50000) + '\n[truncated]';
    }
    return sanitized;
}
// 🛡️ Auth + Usage limits для всех AI endpoints
router.use(auth_middleware_1.authMiddleware);
router.use(usage_middleware_1.checkUsageLimits);
// Универсальный endpoint для генерации текста (использует серверный ключ)
// Поддерживает модельный роутинг: taskType → Claude Sonnet 4 / GPT-4o / GPT-4o-mini
router.post('/generate', [
    (0, express_validator_1.body)('systemPrompt').trim().notEmpty().withMessage('systemPrompt is required'),
    (0, express_validator_1.body)('userPrompt').trim().notEmpty().withMessage('userPrompt is required'),
    (0, express_validator_1.body)('temperature').optional().isFloat({ min: 0, max: 2 }),
    (0, express_validator_1.body)('maxTokens').optional().isInt({ min: 1, max: 64000 }),
    (0, express_validator_1.body)('model').optional().isIn(['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo']),
    (0, express_validator_1.body)('taskType').optional().isString(),
], async (req, res) => {
    logger_1.logger.debug('[AI Generate] Request received:', {
        systemPromptLength: req.body.systemPrompt?.length,
        userPromptLength: req.body.userPrompt?.length
    });
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            logger_1.logger.debug('[AI Generate] Validation errors:', errors.array());
            res.status(400).json({ success: false, errors: errors.array() });
            return;
        }
        // Используем серверный ключ из .env
        if (!OPENAI_API_KEY) {
            res.status(500).json({
                success: false,
                message: 'AI сервис не настроен. Обратитесь к администратору.'
            });
            return;
        }
        const { systemPrompt, userPrompt: rawUserPrompt, temperature = 0.85, maxTokens = 4000, model, taskType } = req.body;
        // Sanitize user input against prompt injection
        const userPrompt = sanitizeUserInput(rawUserPrompt);
        // Если указан taskType — используем AIService с модельным роутингом (Claude/GPT)
        const ROUTED_TASK_TYPES = [
            'text_generation', 'essay', 'coursework', 'referat', 'dissertation', 'style_improvement',
            'analysis', 'presentation', 'outline', 'self_review', 'chat', 'plagiarism'
        ];
        // Для текстовых задач — повышаем temperature и penalties для человечности
        const TEXT_TASK_TYPES = ['text_generation', 'essay', 'coursework', 'referat', 'dissertation', 'style_improvement'];
        const isTextTask = TEXT_TASK_TYPES.includes(taskType);
        if (taskType && ROUTED_TASK_TYPES.includes(taskType)) {
            logger_1.logger.debug(`[AI] Using model routing for taskType: ${taskType}`);
            try {
                const result = await getAIService().generate(taskType, systemPrompt, userPrompt, {
                    temperature: isTextTask ? Math.max(temperature, 0.92) : temperature,
                    maxTokens,
                    presencePenalty: isTextTask ? 0.75 : 0.6,
                    frequencyPenalty: isTextTask ? 0.55 : 0.4,
                });
                logger_1.logger.info(`[AI] Routed to ${result.provider}/${result.model}, ${result.content.length} chars`);
                res.json({
                    success: true,
                    content: result.content,
                    model: result.model,
                    provider: result.provider,
                    usage: null
                });
                return;
            }
            catch (routingError) {
                logger_1.logger.error(`[AI] Routing error for ${taskType}, falling back to OpenAI:`, routingError instanceof Error ? routingError.message : 'Unknown error');
                // Fall through to standard OpenAI generation
            }
        }
        const openai = getOpenAIClient();
        // Умный выбор модели
        const selectedModel = model || selectOptimalModel({ maxTokens, useHighQuality: true });
        // Генерация с fallback
        const result = await generateWithFallback(openai, {
            systemPrompt,
            userPrompt,
            temperature,
            maxTokens,
            model: selectedModel,
            enableFallback: true,
            maxRetries: 2,
        });
        res.json({
            success: true,
            content: result.content,
            model: result.model,
            usage: result.usage
        });
    }
    catch (error) {
        logger_1.logger.error('AI generation error:', error);
        // Обработка ошибок OpenAI (без раскрытия деталей ключа)
        const errorCode = error.code;
        if (errorCode === 'invalid_api_key') {
            res.status(500).json({ success: false, message: 'Ошибка конфигурации сервера' });
            return;
        }
        if (errorCode === 'insufficient_quota') {
            res.status(402).json({ success: false, message: 'Превышен лимит API. Попробуйте позже.' });
            return;
        }
        if (errorCode === 'rate_limit_exceeded') {
            res.status(429).json({ success: false, message: 'Слишком много запросов. Подождите минуту.' });
            return;
        }
        res.status(500).json({
            success: false,
            message: 'Ошибка генерации. Попробуйте позже.'
        });
    }
});
// ================== STREAMING ENDPOINT ==================
// Uses real streaming (Claude/OpenAI streaming API) for Vercel 60s timeout on Hobby plan
router.post('/generate-stream', [
    (0, express_validator_1.body)('systemPrompt').trim().notEmpty().withMessage('systemPrompt is required'),
    (0, express_validator_1.body)('userPrompt').trim().notEmpty().withMessage('userPrompt is required'),
    (0, express_validator_1.body)('temperature').optional().isFloat({ min: 0, max: 2 }),
    (0, express_validator_1.body)('maxTokens').optional().isInt({ min: 1, max: 64000 }),
    (0, express_validator_1.body)('taskType').optional().isString(),
], async (req, res) => {
    logger_1.logger.debug('[AI Stream] Request received');
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ success: false, errors: errors.array() });
            return;
        }
        if (!OPENAI_API_KEY) {
            res.status(500).json({ success: false, message: 'AI сервис не настроен' });
            return;
        }
        const { systemPrompt, userPrompt: rawUserPrompt, temperature = 0.85, maxTokens = 4000, taskType } = req.body;
        const userPrompt = sanitizeUserInput(rawUserPrompt);
        // Set SSE headers FIRST — this enables Vercel streaming mode (60s timeout on Hobby)
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.flushHeaders();
        // Send initial heartbeat to confirm connection
        res.write(`data: ${JSON.stringify({ content: '', done: false, status: 'connected' })}\n\n`);
        const ROUTED_TASK_TYPES = [
            'text_generation', 'essay', 'coursework', 'referat', 'dissertation', 'style_improvement',
            'analysis', 'presentation', 'outline', 'self_review', 'chat', 'plagiarism'
        ];
        const TEXT_TASK_TYPES = ['text_generation', 'essay', 'coursework', 'referat', 'dissertation', 'style_improvement'];
        const isTextTask = TEXT_TASK_TYPES.includes(taskType);
        if (taskType && ROUTED_TASK_TYPES.includes(taskType)) {
            // Use AIService streaming (Claude for text, GPT for others)
            try {
                const result = await getAIService().generateStream(taskType, systemPrompt, userPrompt, {
                    temperature: isTextTask ? Math.max(temperature, 0.92) : temperature,
                    maxTokens,
                    presencePenalty: isTextTask ? 0.75 : 0.6,
                    frequencyPenalty: isTextTask ? 0.55 : 0.4,
                }, (chunk) => {
                    // Send each chunk as SSE in real-time
                    res.write(`data: ${JSON.stringify({ content: chunk, done: false })}\n\n`);
                });
                logger_1.logger.info(`[AI Stream] Routed to ${result.provider}/${result.model}, ${result.content.length} chars`);
                // Send final humanized content (postProcessHumanize was applied in generateStream)
                res.write(`data: ${JSON.stringify({ content: '', done: true, fullContent: result.content })}\n\n`);
                res.end();
                return;
            }
            catch (routingError) {
                logger_1.logger.error(`[AI Stream] Routing error for ${taskType}:`, routingError instanceof Error ? routingError.message : 'Unknown error');
                // Send error via SSE
                res.write(`data: ${JSON.stringify({ error: 'Ошибка генерации. Попробуйте позже.', done: true })}\n\n`);
                res.end();
                return;
            }
        }
        // Fallback: standard OpenAI streaming for unrouted tasks
        const openai = getOpenAIClient();
        const selectedModel = selectOptimalModel({ maxTokens, useHighQuality: true });
        const stream = await openai.chat.completions.create({
            model: selectedModel,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature,
            max_tokens: maxTokens,
            presence_penalty: 0.7,
            frequency_penalty: 0.5,
            stream: true,
        });
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                res.write(`data: ${JSON.stringify({ content, done: false })}\n\n`);
            }
        }
        res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
        res.end();
    }
    catch (error) {
        logger_1.logger.error('AI streaming error:', error);
        // Try to send error via SSE if headers were already sent
        try {
            res.write(`data: ${JSON.stringify({ error: 'Ошибка генерации', done: true })}\n\n`);
            res.end();
        }
        catch {
            // If headers not sent yet, respond with JSON
            if (!res.headersSent) {
                res.status(500).json({ success: false, message: 'Ошибка генерации' });
            }
        }
    }
});
// ================== GPT-4 VISION ENDPOINT ==================
router.post('/analyze-image', [
    (0, express_validator_1.body)('imageUrl').trim().notEmpty().withMessage('imageUrl is required'),
    (0, express_validator_1.body)('prompt').optional().trim(),
], async (req, res) => {
    logger_1.logger.debug('[AI Vision] Request received');
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ success: false, errors: errors.array() });
            return;
        }
        if (!OPENAI_API_KEY) {
            res.status(500).json({ success: false, message: 'AI сервис не настроен' });
            return;
        }
        const { imageUrl, prompt = 'Опиши это изображение детально для использования в презентации', imageBase64 } = req.body;
        const openai = new openai_1.default({ apiKey: OPENAI_API_KEY });
        const imageContent = imageBase64
            ? { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
            : { type: 'image_url', image_url: { url: imageUrl } };
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        imageContent,
                    ],
                },
            ],
            max_tokens: 1000,
        });
        res.json({
            success: true,
            analysis: response.choices[0]?.message?.content || '',
            usage: response.usage,
        });
    }
    catch (error) {
        logger_1.logger.error('AI Vision error:', error);
        res.status(500).json({ success: false, message: 'Ошибка анализа изображения' });
    }
});
// ================== AI HUMANIZATION ENDPOINT ==================
// Uses Claude/GPT to rewrite text so it passes AI detectors (GPTZero, Turnitin, etc.)
router.post('/humanize', [
    (0, express_validator_1.body)('text').trim().notEmpty().withMessage('text is required'),
    (0, express_validator_1.body)('mode').optional().isIn(['academic', 'aggressive', 'quick']),
], async (req, res) => {
    logger_1.logger.debug('[AI Humanize] Request received');
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ success: false, errors: errors.array() });
            return;
        }
        const { text, mode = 'academic' } = req.body;
        if (text.length < 50) {
            res.status(400).json({ success: false, message: 'Текст слишком короткий для гуманизации (минимум 50 символов)' });
            return;
        }
        if (text.length > 100000) {
            res.status(400).json({ success: false, message: 'Текст слишком длинный (макс. 100 000 символов)' });
            return;
        }
        const aiService = getAIService();
        // Step 1: Post-process to remove obvious AI markers via regex
        let humanized = aiService.postProcessHumanize(text);
        // Step 2: AI-powered rewrite (the main humanization engine)
        try {
            humanized = await aiService.singlePassHumanize(humanized);
        }
        catch (err) {
            logger_1.logger.warn(`AI humanization pass failed, returning regex-cleaned version: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
        // Step 3: For aggressive mode, run a second AI pass focused on remaining patterns
        if (mode === 'aggressive' && humanized.length > 200) {
            try {
                const secondPass = await aiService.singlePassHumanize(humanized);
                if (secondPass.length >= humanized.length * 0.7) {
                    humanized = secondPass;
                }
            }
            catch (err) {
                logger_1.logger.warn(`Second humanization pass failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
        }
        await (0, usage_middleware_1.recordUsage)(req.userId || 'anonymous', Math.ceil(humanized.length / 4), 'humanize', { mode, originalLength: text.length, humanizedLength: humanized.length });
        res.json({
            success: true,
            humanizedText: humanized,
            originalLength: text.length,
            humanizedLength: humanized.length,
            mode,
        });
    }
    catch (error) {
        logger_1.logger.error('AI Humanization error:', error);
        res.status(500).json({ success: false, message: 'Ошибка гуманизации текста' });
    }
});
// ================== PLAGIARISM CHECK ENDPOINT (REAL API) ==================
router.post('/check-plagiarism', [
    (0, express_validator_1.body)('text').trim().notEmpty().withMessage('text is required'),
    (0, express_validator_1.body)('language').optional().isIn(['ru', 'en']),
], async (req, res) => {
    logger_1.logger.debug('[Plagiarism Check] Request received');
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ success: false, errors: errors.array() });
            return;
        }
        const { text, language = 'ru' } = req.body;
        // Use real multi-engine plagiarism service
        const result = await (0, plagiarism_service_1.checkPlagiarism)(text, language);
        res.json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        logger_1.logger.error('Plagiarism check error:', error);
        res.status(500).json({ success: false, message: 'Ошибка проверки' });
    }
});
// 📊 Получить информацию об использовании
router.get('/usage', async (req, res) => {
    try {
        const usage = await (0, usage_middleware_1.getUsageInfo)(req.userId);
        res.json({ success: true, usage });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Ошибка получения данных' });
    }
});
// Generate research outline/plan
router.post('/generate-outline', [
    (0, express_validator_1.body)('topic').trim().notEmpty(),
    (0, express_validator_1.body)('projectId').notEmpty(),
    (0, express_validator_1.body)('type').optional().isIn(['THESIS', 'DISSERTATION', 'RESEARCH_PAPER', 'ARTICLE', 'REVIEW'])
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ success: false, errors: errors.array() });
            return;
        }
        const { topic, projectId, type, additionalContext } = req.body;
        // Verify project ownership
        const project = await index_1.prisma.project.findFirst({
            where: { id: projectId, userId: req.userId }
        });
        if (!project) {
            res.status(404).json({
                success: false,
                message: 'Project not found'
            });
            return;
        }
        // Generate outline using AI
        const outline = await getAIService().generateOutline(topic, type || project.type, additionalContext);
        // Save outline to database
        const savedOutline = await index_1.prisma.outline.create({
            data: {
                title: `Outline: ${topic}`,
                sections: JSON.stringify(outline),
                projectId
            }
        });
        // 📊 Записываем использование
        await (0, usage_middleware_1.recordUsage)(req.userId, 500, 'ai_outline', { topic, projectId });
        res.json({
            success: true,
            data: {
                outline: savedOutline,
                generatedContent: outline
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Outline generation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate outline'
        });
    }
});
// Generate thesis/arguments
router.post('/generate-arguments', [
    (0, express_validator_1.body)('topic').trim().notEmpty(),
    (0, express_validator_1.body)('outline').optional()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ success: false, errors: errors.array() });
            return;
        }
        const { topic, outline, researchQuestions } = req.body;
        const arguments_ = await getAIService().generateArguments(topic, outline, researchQuestions);
        res.json({
            success: true,
            data: arguments_
        });
    }
    catch (error) {
        logger_1.logger.error('Arguments generation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate arguments'
        });
    }
});
// Generate draft based on outline
router.post('/generate-draft', [
    (0, express_validator_1.body)('projectId').notEmpty(),
    (0, express_validator_1.body)('section').optional().trim(),
    (0, express_validator_1.body)('outlineId').optional()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ success: false, errors: errors.array() });
            return;
        }
        const { projectId, section, outlineId, customInstructions, targetWords } = req.body;
        // Get project with outline
        const project = await index_1.prisma.project.findFirst({
            where: { id: projectId, userId: req.userId },
            include: {
                outlines: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                },
                references: true
            }
        });
        if (!project) {
            res.status(404).json({
                success: false,
                message: 'Project not found'
            });
            return;
        }
        const outline = outlineId
            ? await index_1.prisma.outline.findUnique({ where: { id: outlineId } })
            : project.outlines[0];
        if (!outline) {
            res.status(400).json({
                success: false,
                message: 'No outline found. Generate an outline first.'
            });
            return;
        }
        // Generate draft
        const draft = await getAIService().generateDraft(project.title, outline.sections, section, project.references.map(r => ({
            title: r.title,
            url: r.url ?? undefined,
            authors: r.authors ? r.authors.split(', ') : undefined,
            year: r.year?.toString(),
        })), customInstructions, targetWords ? parseInt(targetWords) : undefined);
        // Save draft as document
        const document = await index_1.prisma.document.create({
            data: {
                title: section ? `${project.title} - ${section}` : project.title,
                content: draft.content,
                type: 'DRAFT',
                projectId,
                userId: req.userId
            }
        });
        // 📊 Записываем использование
        await (0, usage_middleware_1.recordUsage)(req.userId, draft.content.length / 4, 'ai_draft', { projectId, section });
        res.json({
            success: true,
            data: {
                document,
                draft
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Draft generation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate draft'
        });
    }
});
// Analyze document (logic, facts, grammar)
router.post('/analyze', [
    (0, express_validator_1.body)('documentId').notEmpty(),
    (0, express_validator_1.body)('analysisType').isIn(['LOGIC', 'GRAMMAR', 'FACTS', 'STYLE', 'COMPREHENSIVE'])
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ success: false, errors: errors.array() });
            return;
        }
        const { documentId, analysisType } = req.body;
        const document = await index_1.prisma.document.findFirst({
            where: {
                id: documentId,
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
        // Perform AI analysis
        const analysisResult = await getAIService().analyzeDocument(document.content, analysisType);
        // Save analysis
        const analysis = await index_1.prisma.aIAnalysis.create({
            data: {
                documentId,
                type: analysisType,
                content: JSON.stringify(analysisResult),
                score: analysisResult.overallScore
            }
        });
        res.json({
            success: true,
            data: analysis
        });
    }
    catch (error) {
        logger_1.logger.error('Analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to analyze document'
        });
    }
});
// Improve document style
router.post('/improve-style', [
    (0, express_validator_1.body)('documentId').notEmpty(),
    (0, express_validator_1.body)('instructions').optional().trim()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ success: false, errors: errors.array() });
            return;
        }
        const { documentId, instructions, preserveOriginal } = req.body;
        const document = await index_1.prisma.document.findFirst({
            where: {
                id: documentId,
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
        // Improve style using AI
        const improvedContent = await getAIService().improveStyle(document.content, instructions);
        // Create new version or update
        let savedDocument;
        if (preserveOriginal) {
            savedDocument = await index_1.prisma.document.create({
                data: {
                    title: document.title,
                    content: improvedContent.content,
                    version: document.version + 1,
                    type: document.type,
                    projectId: document.projectId,
                    userId: req.userId,
                    parentId: document.id
                }
            });
        }
        else {
            savedDocument = await index_1.prisma.document.update({
                where: { id: documentId },
                data: { content: improvedContent.content }
            });
        }
        res.json({
            success: true,
            data: {
                document: savedDocument,
                changes: improvedContent.changes
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Style improvement error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to improve style'
        });
    }
});
// Self-review with chain-of-thought
router.post('/self-review', [
    (0, express_validator_1.body)('documentId').notEmpty()
], async (req, res) => {
    try {
        const { documentId } = req.body;
        const document = await index_1.prisma.document.findFirst({
            where: {
                id: documentId,
                userId: req.userId
            },
            include: {
                project: true
            }
        });
        if (!document) {
            res.status(404).json({
                success: false,
                message: 'Document not found'
            });
            return;
        }
        // Perform self-review using chain-of-thought
        const review = await getAIService().selfReview(document.content, document.project.type);
        res.json({
            success: true,
            data: review
        });
    }
    catch (error) {
        logger_1.logger.error('Self-review error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to perform self-review'
        });
    }
});
exports.default = router;
//# sourceMappingURL=ai.routes.js.map