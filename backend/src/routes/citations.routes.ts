/**
 * Citations Proxy Routes
 * Proxies CrossRef, Semantic Scholar, and OpenAlex API calls through the backend
 * to avoid CORS issues and enforce rate limiting
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

const router = Router();

// All citation routes require authentication
router.use(authMiddleware);

// ==================== CrossRef Search ====================
router.get('/crossref', async (req: Request, res: Response) => {
  try {
    const { q, limit = '10' } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
    }

    const response = await fetch(
      `https://api.crossref.org/works?query=${encodeURIComponent(q)}&rows=${limit}&sort=relevance&order=desc`,
      {
        headers: {
          'User-Agent': 'ScienceAI/1.0 (mailto:support@science-ai.app)',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`CrossRef API error: ${response.status}`);
    }

    const data = await response.json() as { message?: { items?: unknown[] } };
    res.json({ success: true, items: data.message?.items || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'CrossRef search failed';
    logger.error('[Citations] CrossRef error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

// ==================== Semantic Scholar Search ====================
router.get('/semantic-scholar', async (req: Request, res: Response) => {
  try {
    const { q, limit = '10' } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
    }

    const response = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(q)}&limit=${limit}&fields=title,authors,year,venue,abstract,citationCount,externalIds,url`,
    );

    if (!response.ok) {
      throw new Error(`Semantic Scholar API error: ${response.status}`);
    }

    const data = await response.json() as { data?: unknown[] };
    res.json({ success: true, data: data.data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Semantic Scholar search failed';
    logger.error('[Citations] Semantic Scholar error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

// ==================== OpenAlex Search ====================
router.get('/openalex', async (req: Request, res: Response) => {
  try {
    const { q, limit = '10' } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
    }

    const response = await fetch(
      `https://api.openalex.org/works?search=${encodeURIComponent(q)}&per-page=${limit}&sort=relevance_score:desc`,
      {
        headers: {
          'User-Agent': 'mailto:support@science-ai.app',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`OpenAlex API error: ${response.status}`);
    }

    const data = await response.json() as { results?: unknown[] };
    res.json({ success: true, results: data.results || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'OpenAlex search failed';
    logger.error('[Citations] OpenAlex error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
