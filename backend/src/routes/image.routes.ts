import { Router, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { searchPhoto } from '../services/image.service';
import { logger } from '../utils/logger';

const router = Router();

// All image routes require auth
router.use(authMiddleware);

// GET /api/images/search?q=landscape+nature
router.get(
  '/search',
  [query('q').trim().notEmpty().withMessage('Query is required')],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const q = req.query.q as string;
      const url = await searchPhoto(q);

      res.json({ success: true, url });
    } catch (error) {
      logger.error('[Images] Search error:', error);
      res.status(500).json({ success: false, message: 'Ошибка поиска изображений' });
    }
  }
);

export default router;
