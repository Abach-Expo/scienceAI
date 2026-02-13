import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { logger } from '../utils/logger';
import { prisma } from '../index';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { checkUsageLimits, recordUsage, getUsageInfo } from '../middleware/usage.middleware';
import { AIService } from '../services/ai.service';
import { checkPlagiarism } from '../services/plagiarism.service';
import OpenAI from 'openai';

const router = Router();
let _aiService: AIService | null = null;
function getAIService(): AIService {
  if (!_aiService) _aiService = new AIService();
  return _aiService;
}

// Серверный API ключ из .env (БЕЗОПАСНО - не виден клиенту)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// ================== УЛУЧШЕННАЯ КОНФИГУРАЦИЯ МОДЕЛЕЙ ==================

type ModelConfig = {
  name: string;
  maxTokens: number;
  costPer1kTokens: number;
  quality: 'highest' | 'high' | 'good';
};

const MODELS: Record<string, ModelConfig> = {
  'gpt-4o': { name: 'gpt-4o', maxTokens: 16384, costPer1kTokens: 0.01, quality: 'highest' },
  'gpt-4o-mini': { name: 'gpt-4o-mini', maxTokens: 16384, costPer1kTokens: 0.00015, quality: 'high' },
  'gpt-3.5-turbo': { name: 'gpt-3.5-turbo', maxTokens: 4096, costPer1kTokens: 0.0005, quality: 'good' },
};

const MODEL_FALLBACK_ORDER = ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'];

// ================== УМНЫЙ ВЫБОР МОДЕЛИ ==================

function selectOptimalModel(params: { maxTokens: number; useHighQuality?: boolean }): string {
  const { maxTokens, useHighQuality = true } = params;
  
  // Для длинных ответов или высокого качества - GPT-4o
  if (maxTokens > 8000 || useHighQuality) {
    return 'gpt-4o';
  }
  
  // Для обычных запросов - gpt-4o-mini (быстрее и дешевле)
  return 'gpt-4o-mini';
}

// ================== RETRY ЛОГИКА С FALLBACK ==================

interface GenerateOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  enableFallback?: boolean;
  maxRetries?: number;
}

async function generateWithFallback(
  openai: OpenAI,
  options: GenerateOptions
): Promise<{ content: string; model: string; usage: Record<string, unknown> | undefined }> {
  const {
    systemPrompt,
    userPrompt,
    temperature = 0.85,
    maxTokens = 4000,
    model,
    enableFallback = true,
    maxRetries = 2,
  } = options;

  const modelsToTry = model 
    ? [model, ...(enableFallback ? MODEL_FALLBACK_ORDER.filter(m => m !== model) : [])]
    : MODEL_FALLBACK_ORDER;

  let lastError: unknown = null;

  for (const currentModel of modelsToTry) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`[AI] Trying ${currentModel}, attempt ${attempt + 1}/${maxRetries + 1}`);
        
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
          presence_penalty: 0.6,  // Уменьшает повторение тем
          frequency_penalty: 0.4, // Уменьшает повторение слов
        });

        const content = response.choices[0]?.message?.content || '';
        
        if (!content || content.length < 10) {
          throw new Error('Empty or too short response');
        }

        logger.info(`[AI] Success with ${currentModel}, ${content.length} chars`);
        
        return {
          content,
          model: currentModel,
          usage: response.usage as Record<string, unknown> | undefined
        };
        
      } catch (error: unknown) {
        lastError = error;
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        const errCode = (error as { code?: string }).code;
        logger.error(`[AI] Error with ${currentModel}, attempt ${attempt + 1}:`, errMsg);
        
        // Rate limit - ждём и пробуем снова
        if (errCode === 'rate_limit_exceeded') {
          const waitTime = Math.pow(2, attempt + 1) * 1000;
          logger.warn(`[AI] Rate limited, waiting ${waitTime}ms...`);
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

function sanitizeUserInput(input: string): string {
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
router.use(authMiddleware);
router.use(checkUsageLimits);

// Универсальный endpoint для генерации текста (использует серверный ключ)
// Поддерживает модельный роутинг: taskType → Claude Sonnet 4 / GPT-4o / GPT-4o-mini
router.post(
  '/generate',
  [
    body('systemPrompt').trim().notEmpty().withMessage('systemPrompt is required'),
    body('userPrompt').trim().notEmpty().withMessage('userPrompt is required'),
    body('temperature').optional().isFloat({ min: 0, max: 2 }),
    body('maxTokens').optional().isInt({ min: 1, max: 16000 }),
    body('model').optional().isIn(['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo']),
    body('taskType').optional().isString(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    logger.debug('[AI Generate] Request received:', { 
      systemPromptLength: req.body.systemPrompt?.length,
      userPromptLength: req.body.userPrompt?.length 
    });
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.debug('[AI Generate] Validation errors:', errors.array());
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

      const { 
        systemPrompt, 
        userPrompt: rawUserPrompt, 
        temperature = 0.85, 
        maxTokens = 4000,
        model,
        taskType 
      } = req.body;

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
        logger.debug(`[AI] Using model routing for taskType: ${taskType}`);
        try {
          const result = await getAIService().generate(taskType, systemPrompt, userPrompt, {
            temperature: isTextTask ? Math.max(temperature, 0.92) : temperature,
            maxTokens,
            presencePenalty: isTextTask ? 0.75 : 0.6,
            frequencyPenalty: isTextTask ? 0.55 : 0.4,
          });

          logger.info(`[AI] Routed to ${result.provider}/${result.model}, ${result.content.length} chars`);

          res.json({
            success: true,
            content: result.content,
            model: result.model,
            provider: result.provider,
            usage: null
          });
          return;
        } catch (routingError: unknown) {
          logger.error(`[AI] Routing error for ${taskType}, falling back to OpenAI:`, routingError instanceof Error ? routingError.message : 'Unknown error');
          // Fall through to standard OpenAI generation
        }
      }

      const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

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
    } catch (error: unknown) {
      logger.error('AI generation error:', error);
      
      // Обработка ошибок OpenAI (без раскрытия деталей ключа)
      const errorCode = (error as { code?: string }).code;
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
  }
);

// ================== STREAMING ENDPOINT ==================
router.post(
  '/generate-stream',
  [
    body('systemPrompt').trim().notEmpty().withMessage('systemPrompt is required'),
    body('userPrompt').trim().notEmpty().withMessage('userPrompt is required'),
    body('temperature').optional().isFloat({ min: 0, max: 2 }),
    body('maxTokens').optional().isInt({ min: 1, max: 16000 }),
    body('taskType').optional().isString(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    logger.debug('[AI Stream] Request received');
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      if (!OPENAI_API_KEY) {
        res.status(500).json({ success: false, message: 'AI сервис не настроен' });
        return;
      }

      const { systemPrompt, userPrompt, temperature = 0.85, maxTokens = 4000, model, taskType } = req.body;

      // Для текстовых задач с taskType — используем AIService (Claude для текстов)
      const TEXT_TASK_TYPES = ['text_generation', 'essay', 'coursework', 'referat', 'dissertation', 'style_improvement'];
      if (taskType && TEXT_TASK_TYPES.includes(taskType)) {
        try {
          const result = await getAIService().generate(taskType, systemPrompt, userPrompt, {
            temperature: Math.max(temperature, 0.92),
            maxTokens,
            presencePenalty: 0.75,
            frequencyPenalty: 0.55,
          });

          // Отдаём результат как SSE (один большой чанк)
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('Access-Control-Allow-Origin', '*');

          // Разбиваем на чанки для плавного отображения
          const chunkSize = 50;
          for (let i = 0; i < result.content.length; i += chunkSize) {
            const chunk = result.content.slice(i, i + chunkSize);
            res.write(`data: ${JSON.stringify({ content: chunk, done: false })}\n\n`);
          }
          res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
          res.end();
          return;
        } catch (routingError: unknown) {
          logger.error(`[AI Stream] Routing error for ${taskType}, falling back to OpenAI:`, routingError instanceof Error ? routingError.message : 'Unknown error');
        }
      }

      const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
      const selectedModel = model || 'gpt-4o';

      // Настройка SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

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

    } catch (error: unknown) {
      logger.error('AI streaming error:', error);
      res.write(`data: ${JSON.stringify({ error: 'Ошибка генерации', done: true })}\n\n`);
      res.end();
    }
  }
);

// ================== GPT-4 VISION ENDPOINT ==================
router.post(
  '/analyze-image',
  [
    body('imageUrl').trim().notEmpty().withMessage('imageUrl is required'),
    body('prompt').optional().trim(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    logger.debug('[AI Vision] Request received');
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      if (!OPENAI_API_KEY) {
        res.status(500).json({ success: false, message: 'AI сервис не настроен' });
        return;
      }

      const { imageUrl, prompt = 'Опиши это изображение детально для использования в презентации', imageBase64 } = req.body;
      const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

      const imageContent = imageBase64 
        ? { type: 'image_url' as const, image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
        : { type: 'image_url' as const, image_url: { url: imageUrl } };

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

    } catch (error: unknown) {
      logger.error('AI Vision error:', error);
      res.status(500).json({ success: false, message: 'Ошибка анализа изображения' });
    }
  }
);

// ================== PLAGIARISM CHECK ENDPOINT (REAL API) ==================
router.post(
  '/check-plagiarism',
  [
    body('text').trim().notEmpty().withMessage('text is required'),
    body('language').optional().isIn(['ru', 'en']),
  ],
  async (req: Request, res: Response): Promise<void> => {
    logger.debug('[Plagiarism Check] Request received');
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { text, language = 'ru' } = req.body;

      // Use real multi-engine plagiarism service
      const result = await checkPlagiarism(text, language);

      res.json({
        success: true,
        ...result,
      });

    } catch (error: unknown) {
      logger.error('Plagiarism check error:', error);
      res.status(500).json({ success: false, message: 'Ошибка проверки' });
    }
  }
);

// 📊 Получить информацию об использовании
router.get('/usage', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const usage = await getUsageInfo(req.userId!);
    res.json({ success: true, usage });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: 'Ошибка получения данных' });
  }
});

// Generate research outline/plan
router.post(
  '/generate-outline',
  [
    body('topic').trim().notEmpty(),
    body('projectId').notEmpty(),
    body('type').optional().isIn(['THESIS', 'DISSERTATION', 'RESEARCH_PAPER', 'ARTICLE', 'REVIEW'])
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { topic, projectId, type, additionalContext } = req.body;

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

      // Generate outline using AI
      const outline = await getAIService().generateOutline(topic, type || project.type, additionalContext);

      // Save outline to database
      const savedOutline = await prisma.outline.create({
        data: {
          title: `Outline: ${topic}`,
          sections: JSON.stringify(outline),
          projectId
        }
      });

      // 📊 Записываем использование
      await recordUsage(req.userId!, 500, 'ai_outline', { topic, projectId });

      res.json({
        success: true,
        data: {
          outline: savedOutline,
          generatedContent: outline
        }
      });
    } catch (error) {
      logger.error('Outline generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate outline'
      });
    }
  }
);

// Generate thesis/arguments
router.post(
  '/generate-arguments',
  [
    body('topic').trim().notEmpty(),
    body('outline').optional()
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
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
    } catch (error) {
      logger.error('Arguments generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate arguments'
      });
    }
  }
);

// Generate draft based on outline
router.post(
  '/generate-draft',
  [
    body('projectId').notEmpty(),
    body('section').optional().trim(),
    body('outlineId').optional()
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { projectId, section, outlineId, customInstructions, targetWords } = req.body;

      // Get project with outline
      const project = await prisma.project.findFirst({
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
        ? await prisma.outline.findUnique({ where: { id: outlineId } })
        : project.outlines[0];

      if (!outline) {
        res.status(400).json({
          success: false,
          message: 'No outline found. Generate an outline first.'
        });
        return;
      }

      // Generate draft
      const draft = await getAIService().generateDraft(
        project.title,
        (outline.sections as unknown) as Array<{ title: string; description: string; subsections?: Array<{ title: string; description: string }> }>,
        section,
        project.references.map(r => ({
          title: r.title,
          url: r.url ?? undefined,
          authors: r.authors ? r.authors.split(', ') : undefined,
          year: r.year?.toString(),
        })),
        customInstructions,
        targetWords ? parseInt(targetWords) : undefined
      );

      // Save draft as document
      const document = await prisma.document.create({
        data: {
          title: section ? `${project.title} - ${section}` : project.title,
          content: draft.content,
          type: 'DRAFT',
          projectId,
          userId: req.userId!
        }
      });

      // 📊 Записываем использование
      await recordUsage(req.userId!, draft.content.length / 4, 'ai_draft', { projectId, section });

      res.json({
        success: true,
        data: {
          document,
          draft
        }
      });
    } catch (error) {
      logger.error('Draft generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate draft'
      });
    }
  }
);

// Analyze document (logic, facts, grammar)
router.post(
  '/analyze',
  [
    body('documentId').notEmpty(),
    body('analysisType').isIn(['LOGIC', 'GRAMMAR', 'FACTS', 'STYLE', 'COMPREHENSIVE'])
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { documentId, analysisType } = req.body;

      const document = await prisma.document.findFirst({
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
      const analysis = await prisma.aIAnalysis.create({
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
    } catch (error) {
      logger.error('Analysis error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze document'
      });
    }
  }
);

// Improve document style
router.post(
  '/improve-style',
  [
    body('documentId').notEmpty(),
    body('instructions').optional().trim()
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { documentId, instructions, preserveOriginal } = req.body;

      const document = await prisma.document.findFirst({
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
        savedDocument = await prisma.document.create({
          data: {
            title: document.title,
            content: improvedContent.content,
            version: document.version + 1,
            type: document.type,
            projectId: document.projectId,
            userId: req.userId!,
            parentId: document.id
          }
        });
      } else {
        savedDocument = await prisma.document.update({
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
    } catch (error) {
      logger.error('Style improvement error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to improve style'
      });
    }
  }
);

// Self-review with chain-of-thought
router.post(
  '/self-review',
  [
    body('documentId').notEmpty()
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { documentId } = req.body;

      const document = await prisma.document.findFirst({
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
    } catch (error) {
      logger.error('Self-review error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform self-review'
      });
    }
  }
);

export default router;
