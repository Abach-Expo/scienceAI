import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';

// Load environment variables BEFORE route imports (routes read env at module load)
dotenv.config();

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { logger } from './utils/logger';
import { initSentry, sentryErrorHandler, Sentry } from './lib/sentry';
import { initWebSocket } from './services/websocket.service';
import { cleanupExpiredTokens } from './utils/tokens';

// Route imports
import authRoutes from './routes/auth.routes';
import projectRoutes from './routes/project.routes';
import documentRoutes from './routes/document.routes';
import aiRoutes from './routes/ai.routes';
import searchRoutes from './routes/search.routes';
import exportRoutes from './routes/export.routes';
import chatRoutes from './routes/chat.routes';
import paymentRoutes from './routes/payment.routes';
import storageRoutes from './routes/storage.routes';
import subscriptionRoutes from './routes/subscription.routes';
import dissertationRoutes from './routes/dissertation.routes';
import imageRoutes from './routes/image.routes';
import presentationRoutes from './routes/presentation.routes';
import citationsRoutes from './routes/citations.routes';
import proxyRoutes from './routes/proxy.routes';
import usageRoutes from './routes/usage.routes';
import llmGatewayRoutes from './routes/llmGateway.routes';

// ==========================================
// SECURITY: Validate required env variables
// ==========================================
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    const errorMsg = `FATAL: Missing required environment variable: ${envVar}`;
    logger.error(errorMsg);
    // In serverless, throw error instead of exit
    if (process.env.VERCEL) {
      throw new Error(errorMsg);
    }
    process.exit(1);
  }
}

// Enforce strong JWT secret in production
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  if (process.env.NODE_ENV === 'production') {
    const msg = 'FATAL: JWT_SECRET must be at least 32 characters in production!';
    logger.error(msg);
    if (process.env.VERCEL) throw new Error(msg);
    process.exit(1);
  } else {
    logger.warn('JWT_SECRET is too short. Use at least 32 characters!');
  }
}

// Initialize Prisma Client with connection pooling for high concurrency
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'warn', 'error'] 
    : ['warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_POOL_URL || process.env.DATABASE_URL,
    },
  },
});

// Enable query metrics in production
if (process.env.NODE_ENV === 'production') {
  prisma.$use(async (params, next) => {
    const before = Date.now();
    const result = await next(params);
    const after = Date.now();
    if (after - before > 1000) {
      logger.warn(`Slow query: ${params.model}.${params.action} took ${after - before}ms`);
    }
    return result;
  });
}

// Create Express app
const app: Application = express();
const PORT = process.env.PORT || 3001;

// Trust proxy (for correct req.ip behind Vercel/nginx/load balancer)
app.set('trust proxy', 1);

// Initialize Sentry (before other middleware)
initSentry(app);

// ==========================================
// SECURITY MIDDLEWARE
// ==========================================

// 🛡️ Helmet - Secure HTTP headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }, // Allow Google OAuth popup
  crossOriginResourcePolicy: false, // Allow cross-origin requests
}));

// 🛡️ HPP - Prevent HTTP Parameter Pollution
app.use(hpp());

// 🛡️ Rate Limiting - Scaled for 30K+ concurrent users
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1500, // 1500 requests per IP per 15 min (scaled for real usage)
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.path === '/api/health', // Don't count health checks
});

// Stricter limit for auth endpoints (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 login attempts per 15 min (slightly more forgiving)
  message: { error: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/refresh', // Don't rate-limit token refresh (called automatically)
});

// Limit for AI endpoints (expensive operations) — scaled for production
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 AI requests per minute per IP (multiple users behind NAT)
  message: { error: 'AI rate limit exceeded. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID for authenticated requests (more accurate than IP)
    return (req as any).userId || req.ip?.replace(/^::ffff:/, '') || 'anonymous';
  },
  validate: false,
});

// Apply general rate limit to all routes
app.use(generalLimiter);

// 🛡️ CORS - Restrict origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'https://science-ai.app',
  'https://www.science-ai.app',
  'https://science-ai-backend-np8p.vercel.app',
  'https://science-ai-backend-l1aw.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin only in development (Postman, etc.)
    // In production, only allow from known origins
    if (!origin) {
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      // In production, allow server-to-server (webhooks) but log it
      logger.info('No-origin request in production (webhook/server-to-server)');
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Raw body for webhook signature verification (MUST be before json parser)
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (hide sensitive data)
app.use((req: Request, res: Response, next: NextFunction) => {
  // Attach unique request ID for tracing
  const requestId = crypto.randomUUID();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-Id', requestId);

  // Don't log sensitive paths in detail
  const safePath = req.path.includes('password') ? '[REDACTED]' : req.path;
  logger.info(`${req.method} ${safePath}`, { requestId });
  next();
});

// Response compression for large AI-generated content
import compression from 'compression';
app.use(compression({
  level: 6,
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress SSE streams
    if (req.headers.accept === 'text/event-stream') return false;
    return compression.filter(req, res);
  },
}));

// Health check endpoint (fast, no DB query)
app.get('/health', async (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', async (_req: Request, res: Response) => {
  let dbStatus = 'unknown';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  const isProduction = process.env.NODE_ENV === 'production';

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    version: '1.0.0',
    // Only expose detailed info in development
    ...(isProduction ? {} : {
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
    }),
  });
});

// ==========================================
// API Routes with specific rate limits
// ==========================================
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/dissertation', aiLimiter, dissertationRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/presentations', presentationRoutes);
app.use('/api/citations', citationsRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/llm', aiLimiter, llmGatewayRoutes);

// Sentry error handler - must be before custom error handler
app.use(sentryErrorHandler());

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(`Error: ${err.message}`);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await prisma.$connect();
    logger.info('Connected to database');
    
    // Skip HTTP server in serverless environment (Vercel)
    if (process.env.VERCEL) {
      logger.info('Running in Vercel serverless mode');
      return;
    }
    
    // Create HTTP server (local development only)
    const httpServer = createServer(app);
    
    // Initialize WebSocket
    initWebSocket(httpServer);
    
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`📡 WebSocket server ready`);
      logger.info(`📚 Scientific AI Assistant API ready`);
    });

    // Clean up expired refresh tokens every 2 hours (more frequent for 30K+ users)
    setInterval(async () => {
      try {
        const count = await cleanupExpiredTokens();
        if (count > 0) logger.info(`Cleaned up ${count} expired refresh tokens`);
      } catch (e) {
        logger.error('Token cleanup error:', e);
      }
    }, 2 * 60 * 60 * 1000);

    // Log memory usage every 5 minutes for monitoring
    setInterval(() => {
      const { heapUsed, heapTotal, rss } = process.memoryUsage();
      logger.info('Memory usage:', {
        heapUsed: `${Math.round(heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(rss / 1024 / 1024)}MB`,
      });
    }, 5 * 60 * 1000);
  } catch (error) {
    logger.error('Failed to start server:', error);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Global error handlers - prevent silent crashes
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Promise Rejection:', reason);
  Sentry.captureException(reason);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  Sentry.captureException(error);
  // Give logger and Sentry time to flush, then exit (only in non-serverless)
  if (!process.env.VERCEL) {
    setTimeout(() => process.exit(1), 1000);
  }
});

// Start server only in non-serverless mode
if (!process.env.VERCEL) {
  startServer();
}

// Export for Vercel serverless
export default app;
module.exports = app;
