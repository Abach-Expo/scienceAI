import { Router, Response } from 'express';
import { query, validationResult } from 'express-validator';
import axios from 'axios';
import { prisma } from '../index';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

const router = Router();

router.use(authMiddleware);

interface ArxivEntry {
  id: string[];
  title: string[];
  summary: string[];
  author: Array<{ name: string[] }>;
  published: string[];
  link: Array<{ $: { href: string; type?: string } }>;
}

interface SemanticScholarPaper {
  paperId: string;
  title: string;
  abstract: string;
  authors: Array<{ name: string }>;
  year: number;
  url: string;
  citationCount: number;
  externalIds?: {
    DOI?: string;
    ArXiv?: string;
  };
}

// Search ArXiv
router.get(
  '/arxiv',
  [
    query('q').trim().notEmpty(),
    query('start').optional().isInt({ min: 0 }),
    query('maxResults').optional().isInt({ min: 1, max: 50 })
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { q, start = 0, maxResults = 10 } = req.query;

      const arxivUrl = process.env.ARXIV_API_URL || 'http://export.arxiv.org/api/query';
      
      const response = await axios.get(arxivUrl, {
        params: {
          search_query: `all:${q}`,
          start,
          max_results: maxResults,
          sortBy: 'relevance',
          sortOrder: 'descending'
        },
        headers: {
          'Accept': 'application/xml'
        }
      });

      // Parse XML response (simplified - in production use xml2js)
      const xmlData = response.data;
      
      // Extract entries using regex (for simplicity)
      const entries: Array<{ id: string; title: string; abstract: string; authors: string[]; published: string; year: number; url: string; source: string }> = [];
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
      let match;

      while ((match = entryRegex.exec(xmlData)) !== null) {
        const entryXml = match[1];
        
        const getId = (xml: string) => {
          const m = xml.match(/<id>(.*?)<\/id>/);
          return m ? m[1] : '';
        };
        
        const getTitle = (xml: string) => {
          const m = xml.match(/<title>([\s\S]*?)<\/title>/);
          return m ? m[1].replace(/\s+/g, ' ').trim() : '';
        };
        
        const getSummary = (xml: string) => {
          const m = xml.match(/<summary>([\s\S]*?)<\/summary>/);
          return m ? m[1].replace(/\s+/g, ' ').trim() : '';
        };
        
        const getAuthors = (xml: string) => {
          const authors: string[] = [];
          const authorRegex = /<author>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<\/author>/g;
          let authorMatch;
          while ((authorMatch = authorRegex.exec(xml)) !== null) {
            authors.push(authorMatch[1]);
          }
          return authors;
        };
        
        const getPublished = (xml: string) => {
          const m = xml.match(/<published>(.*?)<\/published>/);
          return m ? m[1] : '';
        };

        const id = getId(entryXml);
        const arxivId = id.split('/abs/').pop()?.split('v')[0] || id;

        entries.push({
          id: arxivId,
          title: getTitle(entryXml),
          abstract: getSummary(entryXml),
          authors: getAuthors(entryXml),
          published: getPublished(entryXml),
          year: new Date(getPublished(entryXml)).getFullYear(),
          url: id,
          source: 'ARXIV'
        });
      }

      res.json({
        success: true,
        data: {
          results: entries,
          total: entries.length,
          query: q
        }
      });
    } catch (error) {
      logger.error('ArXiv search error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search ArXiv'
      });
    }
  }
);

// Search Semantic Scholar
router.get(
  '/semantic-scholar',
  [
    query('q').trim().notEmpty(),
    query('offset').optional().isInt({ min: 0 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { q, offset = 0, limit = 10 } = req.query;

      const ssUrl = process.env.SEMANTIC_SCHOLAR_API_URL || 'https://api.semanticscholar.org/graph/v1';
      
      const headers: Record<string, string> = {};
      if (process.env.SEMANTIC_SCHOLAR_API_KEY) {
        headers['x-api-key'] = process.env.SEMANTIC_SCHOLAR_API_KEY;
      }

      const response = await axios.get(`${ssUrl}/paper/search`, {
        params: {
          query: q,
          offset,
          limit,
          fields: 'paperId,title,abstract,authors,year,url,citationCount,externalIds'
        },
        headers
      });

      const papers = response.data.data?.map((paper: SemanticScholarPaper) => ({
        id: paper.paperId,
        title: paper.title,
        abstract: paper.abstract,
        authors: paper.authors?.map(a => a.name) || [],
        year: paper.year,
        url: paper.url,
        citationCount: paper.citationCount,
        doi: paper.externalIds?.DOI,
        arxivId: paper.externalIds?.ArXiv,
        source: 'SEMANTIC_SCHOLAR'
      })) || [];

      res.json({
        success: true,
        data: {
          results: papers,
          total: response.data.total || papers.length,
          offset: Number(offset),
          query: q
        }
      });
    } catch (error) {
      logger.error('Semantic Scholar search error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search Semantic Scholar'
      });
    }
  }
);

// Combined search (both sources)
router.get(
  '/combined',
  [
    query('q').trim().notEmpty(),
    query('maxResults').optional().isInt({ min: 1, max: 50 })
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { q, maxResults = 10 } = req.query;
      const halfResults = Math.ceil(Number(maxResults) / 2);

      // Search both sources in parallel
      const [arxivResults, ssResults] = await Promise.allSettled([
        axios.get(process.env.ARXIV_API_URL || 'http://export.arxiv.org/api/query', {
          params: {
            search_query: `all:${q}`,
            max_results: halfResults
          }
        }),
        axios.get(`${process.env.SEMANTIC_SCHOLAR_API_URL || 'https://api.semanticscholar.org/graph/v1'}/paper/search`, {
          params: {
            query: q,
            limit: halfResults,
            fields: 'paperId,title,abstract,authors,year,url,citationCount,externalIds'
          }
        })
      ]);

      const results: Array<{ id: string; title: string; abstract?: string; authors?: string[]; year?: number; url?: string; source: string }> = [];

      // Process ArXiv results
      if (arxivResults.status === 'fulfilled') {
        // Parse and add ArXiv results (simplified)
        const xmlData = arxivResults.value.data;
        const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
        let match;

        while ((match = entryRegex.exec(xmlData)) !== null) {
          const entryXml = match[1];
          const titleMatch = entryXml.match(/<title>([\s\S]*?)<\/title>/);
          const idMatch = entryXml.match(/<id>(.*?)<\/id>/);
          
          if (titleMatch && idMatch) {
            results.push({
              id: idMatch[1],
              title: titleMatch[1].replace(/\s+/g, ' ').trim(),
              source: 'ARXIV'
            });
          }
        }
      }

      // Process Semantic Scholar results
      if (ssResults.status === 'fulfilled') {
        const papers = ssResults.value.data.data || [];
        papers.forEach((paper: SemanticScholarPaper) => {
          results.push({
            id: paper.paperId,
            title: paper.title,
            abstract: paper.abstract,
            authors: paper.authors?.map(a => a.name) || [],
            year: paper.year,
            url: paper.url,
            source: 'SEMANTIC_SCHOLAR'
          });
        });
      }

      res.json({
        success: true,
        data: {
          results,
          total: results.length,
          query: q
        }
      });
    } catch (error) {
      logger.error('Combined search error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform combined search'
      });
    }
  }
);

// Save reference to project
router.post(
  '/save-reference',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { projectId, reference } = req.body;

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

      const savedReference = await prisma.reference.create({
        data: {
          title: reference.title,
          authors: reference.authors || [],
          abstract: reference.abstract,
          url: reference.url,
          doi: reference.doi,
          arxivId: reference.arxivId || reference.id,
          year: reference.year,
          source: reference.source || 'MANUAL',
          projectId
        }
      });

      res.status(201).json({
        success: true,
        data: savedReference
      });
    } catch (error) {
      logger.error('Save reference error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save reference'
      });
    }
  }
);

// Get project references
router.get('/project/:projectId/references', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.projectId, userId: req.userId }
    });

    if (!project) {
      res.status(404).json({
        success: false,
        message: 'Project not found'
      });
      return;
    }

    const references = await prisma.reference.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: references
    });
  } catch (error) {
    logger.error('Get references error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch references'
    });
  }
});

export default router;
