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

// Warn about weak JWT secret
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  logger.warn('JWT_SECRET is too short. Use at least 32 characters!');
}

// Initialize Prisma Client
export const prisma = new PrismaClient();

// Create Express app
const app: Application = express();
const PORT = process.env.PORT || 3001;

// Initialize Sentry (before other middleware)
initSentry(app);

// ==========================================
// SECURITY MIDDLEWARE
// ==========================================

// 🛡️ Helmet - Secure HTTP headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false, // Allow Google OAuth popup
  crossOriginResourcePolicy: false, // Allow cross-origin requests
}));

// 🛡️ HPP - Prevent HTTP Parameter Pollution
app.use(hpp());

// 🛡️ Rate Limiting - Prevent brute force attacks
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP per 15 min
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for auth endpoints (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Only 10 login attempts per 15 min
  message: { error: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limit for AI endpoints (expensive operations)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 AI requests per minute
  message: { error: 'AI rate limit exceeded. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
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
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
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

// Health check endpoint
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

// Sentry error handler - must be before custom error handler
app.use(sentryErrorHandler());

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(`Error: ${err.message}`);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message,
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
