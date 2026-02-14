import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { DissertationService, GenerationProgress } from '../services/dissertation.service';
import { logger } from '../utils/logger';

const router = Router();
let _dissertationService: DissertationService | null = null;
function getDissertationService(): DissertationService {
  if (!_dissertationService) _dissertationService = new DissertationService();
  return _dissertationService;
}

// ==================== SSE: Генерация полной работы ====================
// POST /api/dissertation/generate
// Стримит прогресс через Server-Sent Events, возвращает полный документ в конце

router.post(
  '/generate',
  authMiddleware,
  [
    body('topic').trim().notEmpty().withMessage('Тема обязательна'),
    body('type').isIn(['essay', 'referat', 'coursework', 'diploma', 'dissertation']).withMessage('Неверный тип работы'),
    body('targetPages').isInt({ min: 3, max: 200 }).withMessage('Количество страниц: 3-200'),
    body('language').optional().isIn(['ru', 'en', 'uk', 'kk', 'uz', 'de', 'fr', 'es', 'zh', 'ar']),
    body('additionalInstructions').optional().trim(),
    body('style').optional().isIn(['academic', 'scientific', 'popular']),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const {
        topic,
        type,
        targetPages,
        language = 'ru',
        additionalInstructions,
        includeReferences = true,
        includeTableOfContents = true,
        style = 'academic',
      } = req.body;

      logger.info(`[Dissertation Route] Generate request: "${topic}", ${targetPages} pages, type=${type}`);

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
      const sendProgress = (progress: GenerationProgress) => {
        if (clientDisconnected) throw new Error('Client disconnected');
        res.write(`data: ${JSON.stringify({ type: 'progress', ...progress })}\n\n`);
      };

      // Генерация
      const result = await getDissertationService().generateFullDissertation(
        {
          topic,
          type,
          targetPages: parseInt(targetPages),
          language,
          additionalInstructions,
          includeReferences,
          includeTableOfContents,
          style,
        },
        sendProgress
      );

      // Отправляем финальный результат
      res.write(`data: ${JSON.stringify({ type: 'result', ...result })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();

    } catch (error: unknown) {
      logger.error('[Dissertation Route] Generation error:', error);

      // Если SSE уже начался, отправляем ошибку через SSE
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Ошибка генерации' })}\n\n`);
        res.end();
      } else {
        res.status(500).json({
          success: false,
          message: 'Ошибка генерации работы',
        });
      }
    }
  }
);

// ==================== Оценка времени и стоимости ====================
// POST /api/dissertation/estimate

router.post(
  '/estimate',
  authMiddleware,
  [
    body('targetPages').isInt({ min: 3, max: 200 }),
    body('type').isIn(['essay', 'referat', 'coursework', 'diploma', 'dissertation']),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
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
    } catch (error: unknown) {
      logger.error('[Dissertation Route] Estimate error:', error);
      res.status(500).json({ success: false, message: 'Ошибка оценки' });
    }
  }
);

export default router;
