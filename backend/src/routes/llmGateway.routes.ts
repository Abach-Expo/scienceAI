// =================================================================
// 🧠 SCIENCE AI — LLM GATEWAY ROUTES
// /api/llm/* — единый API для всех AI-запросов с сайта
// =================================================================

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { logger } from '../utils/logger';
import { authMiddleware } from '../middleware/auth.middleware';
import { checkUsageLimits, recordUsage } from '../middleware/usage.middleware';
import { getLLMGateway } from '../services/llmGateway.service';
import { getLLMCache } from '../services/llmCache.service';
import type { LLMRequest } from '../services/llmGateway.service';
import type { ProviderName } from '../services/llmGateway.prompts';

const router = Router();

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

function sanitizeInput(input: string): string {
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
router.use(authMiddleware);
router.use(checkUsageLimits);

// ==================== POST /api/llm/chat ====================
// Основной endpoint для чат-запросов с историей

router.post(
  '/chat',
  [
    body('message').trim().notEmpty().withMessage('message is required'),
    body('taskType').optional().isString(),
    body('conversationHistory').optional().isArray(),
    body('options').optional().isObject(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { message, taskType, conversationHistory, options } = req.body;

      const gateway = getLLMGateway();

      const request: LLMRequest = {
        taskType: taskType || 'chat',
        userPrompt: sanitizeInput(message),
        conversationHistory: conversationHistory?.map((m: any) => ({
          role: m.role,
          content: sanitizeInput(m.content || ''),
        })),
        options: {
          temperature: options?.temperature,
          maxTokens: options?.maxTokens,
          language: options?.language,
          provider: options?.provider as ProviderName | undefined,
          jsonMode: options?.jsonMode,
        },
      };

      const result = await gateway.generate(request);

      // Записываем использование
      const userId = (req as any).userId;
      if (userId) {
        await recordUsage(userId, result.usage.totalTokens, 'llm_chat', { taskType: taskType || 'chat' }, result._model);
      }

      res.json({
        success: true,
        content: result.content,
        model: result.model, // "Science AI"
        usage: result.usage,
        latencyMs: result.latencyMs,
      });
    } catch (error) {
      logger.error('[LLM Chat] Error:', error instanceof Error ? error.message : 'Unknown');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка генерации. Попробуйте позже.',
      });
    }
  }
);

// ==================== POST /api/llm/generate ====================
// Генерация с кастомным системным промптом (для презентаций, диссертаций и т.д.)

router.post(
  '/generate',
  [
    body('userPrompt').trim().notEmpty().withMessage('userPrompt is required'),
    body('systemPrompt').optional().isString(),
    body('taskType').optional().isString(),
    body('temperature').optional().isFloat({ min: 0, max: 2 }),
    body('maxTokens').optional().isInt({ min: 1, max: 64000 }),
    body('options').optional().isObject(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      // Backward-compatible: accept temperature/maxTokens at top-level OR inside options
      const { userPrompt, systemPrompt, taskType, options, temperature, maxTokens } = req.body;

      const gateway = getLLMGateway();

      const request: LLMRequest = {
        taskType: taskType || 'chat',
        userPrompt: sanitizeInput(userPrompt),
        systemPrompt: systemPrompt, // Кастомный промпт дополняет базовый
        options: {
          temperature: options?.temperature ?? temperature,
          maxTokens: options?.maxTokens ?? maxTokens,
          language: options?.language,
          provider: options?.provider as ProviderName | undefined,
          model: options?.model,
          jsonMode: options?.jsonMode,
        },
      };

      const result = await gateway.generate(request);

      // Записываем использование
      const userId = (req as any).userId;
      if (userId) {
        await recordUsage(userId, result.usage.totalTokens, 'llm_generate', { taskType: taskType || 'generate' }, result._model);
      }

      res.json({
        success: true,
        content: result.content,
        model: result.model, // "Science AI"
        usage: result.usage,
        latencyMs: result.latencyMs,
      });
    } catch (error) {
      logger.error('[LLM Generate] Error:', error instanceof Error ? error.message : 'Unknown');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка генерации. Попробуйте позже.',
      });
    }
  }
);

// ==================== POST /api/llm/stream ====================
// SSE streaming для чата в реальном времени

router.post(
  '/stream',
  [
    // Accept both 'message' and 'userPrompt' for backward compat
    body('message').optional().isString(),
    body('userPrompt').optional().isString(),
    body('systemPrompt').optional().isString(),
    body('taskType').optional().isString(),
    body('temperature').optional().isFloat({ min: 0, max: 2 }),
    body('maxTokens').optional().isInt({ min: 1, max: 64000 }),
    body('conversationHistory').optional().isArray(),
    body('options').optional().isObject(),
  ],
  async (req: Request, res: Response): Promise<void> => {
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

      const gateway = getLLMGateway();

      const request: LLMRequest = {
        taskType: taskType || 'chat',
        userPrompt: sanitizeInput(actualMessage),
        systemPrompt: systemPrompt,
        conversationHistory: conversationHistory?.map((m: any) => ({
          role: m.role,
          content: sanitizeInput(m.content || ''),
        })),
        options: {
          temperature: options?.temperature ?? temperature,
          maxTokens: options?.maxTokens ?? maxTokens,
          language: options?.language,
          provider: options?.provider as ProviderName | undefined,
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
      const userId = (req as any).userId;
      if (userId) {
        const approxTokens = Math.ceil(totalContent.length / 4);
        await recordUsage(userId, approxTokens, 'llm_stream', { taskType: taskType || 'chat' }, 'stream');
      }

      res.end();
    } catch (error) {
      logger.error('[LLM Stream] Error:', error instanceof Error ? error.message : 'Unknown');
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Ошибка стриминга. Попробуйте позже.',
        });
      } else {
        res.write(`data: ${JSON.stringify({ error: 'Stream error', done: true })}\n\n`);
        res.end();
      }
    }
  }
);

// ==================== GET /api/llm/status ====================
// Статус Gateway и доступных провайдеров

router.get('/status', async (_req: Request, res: Response): Promise<void> => {
  try {
    const gateway = getLLMGateway();
    const status = gateway.getStatus();

    res.json({
      success: true,
      gateway: 'Science AI LLM Gateway',
      version: '1.0.0',
      ...status,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Gateway status unavailable' });
  }
});

// ==================== GET /api/llm/models ====================
// Список доступных "моделей" Science AI (маппинг на реальные)

router.get('/models', async (_req: Request, res: Response): Promise<void> => {
  const gateway = getLLMGateway();
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

// ==================== GET /api/llm/cache/stats ====================
// Статистика кэша: hit rate, tokens saved, entries

router.get('/cache/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const cache = getLLMCache();
    const stats = cache.getStats();

    res.json({
      success: true,
      cache: {
        ...stats,
        hitRateFormatted: `${stats.hitRate}%`,
        sizeMB: (stats.sizeBytes / 1024 / 1024).toFixed(2),
        estimatedSavingsUSD: (stats.tokensSaved / 1000 * 0.003).toFixed(4), // ~$0.003 per 1K tokens avg
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Cache stats unavailable' });
  }
});

// ==================== POST /api/llm/cache/clear ====================
// Очистка кэша (admin action)

router.post('/cache/clear', async (_req: Request, res: Response): Promise<void> => {
  try {
    const cache = getLLMCache();
    const statsBefore = cache.getStats();
    cache.clear();

    res.json({
      success: true,
      message: `Cache cleared. Was: ${statsBefore.entries} entries, ${statsBefore.tokensSaved} tokens saved.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Cache clear failed' });
  }
});

export default router;
