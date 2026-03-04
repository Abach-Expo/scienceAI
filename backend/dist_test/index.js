"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
// Load environment variables BEFORE route imports (routes read env at module load)
dotenv_1.default.config();
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const hpp_1 = __importDefault(require("hpp"));
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("@prisma/client");
const logger_1 = require("./utils/logger");
const sentry_1 = require("./lib/sentry");
const websocket_service_1 = require("./services/websocket.service");
const tokens_1 = require("./utils/tokens");
// Route imports
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const project_routes_1 = __importDefault(require("./routes/project.routes"));
const document_routes_1 = __importDefault(require("./routes/document.routes"));
const ai_routes_1 = __importDefault(require("./routes/ai.routes"));
const search_routes_1 = __importDefault(require("./routes/search.routes"));
const export_routes_1 = __importDefault(require("./routes/export.routes"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const storage_routes_1 = __importDefault(require("./routes/storage.routes"));
const subscription_routes_1 = __importDefault(require("./routes/subscription.routes"));
const dissertation_routes_1 = __importDefault(require("./routes/dissertation.routes"));
const image_routes_1 = __importDefault(require("./routes/image.routes"));
const presentation_routes_1 = __importDefault(require("./routes/presentation.routes"));
const citations_routes_1 = __importDefault(require("./routes/citations.routes"));
const proxy_routes_1 = __importDefault(require("./routes/proxy.routes"));
const usage_routes_1 = __importDefault(require("./routes/usage.routes"));
const llmGateway_routes_1 = __importDefault(require("./routes/llmGateway.routes"));
// ==========================================
// SECURITY: Validate required env variables
// ==========================================
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        const errorMsg = `FATAL: Missing required environment variable: ${envVar}`;
        logger_1.logger.error(errorMsg);
        // In serverless, throw error instead of exit
        if (process.env.VERCEL) {
            throw new Error(errorMsg);
        }
        process.exit(1);
    }
}
// Warn about weak JWT secret
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    logger_1.logger.warn('JWT_SECRET is too short. Use at least 32 characters!');
}
// Initialize Prisma Client
exports.prisma = new client_1.PrismaClient();
// Create Express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Trust proxy (for correct req.ip behind Vercel/nginx/load balancer)
app.set('trust proxy', 1);
// Initialize Sentry (before other middleware)
(0, sentry_1.initSentry)(app);
// ==========================================
// SECURITY MIDDLEWARE
// ==========================================
// 🛡️ Helmet - Secure HTTP headers
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false, // Disable for API
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }, // Allow Google OAuth popup
    crossOriginResourcePolicy: false, // Allow cross-origin requests
}));
// 🛡️ HPP - Prevent HTTP Parameter Pollution
app.use((0, hpp_1.default)());
// 🛡️ Rate Limiting - Prevent brute force attacks
const generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per IP per 15 min
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
// Stricter limit for auth endpoints (prevent brute force)
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Only 10 login attempts per 15 min
    message: { error: 'Too many login attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
// Limit for AI endpoints (expensive operations)
const aiLimiter = (0, express_rate_limit_1.default)({
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
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            logger_1.logger.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Raw body for webhook signature verification (MUST be before json parser)
app.use('/api/payments/webhook', express_1.default.raw({ type: 'application/json' }));
// Body parsing with size limits
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Request logging middleware (hide sensitive data)
app.use((req, res, next) => {
    // Attach unique request ID for tracing
    const requestId = crypto_1.default.randomUUID();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-Id', requestId);
    // Don't log sensitive paths in detail
    const safePath = req.path.includes('password') ? '[REDACTED]' : req.path;
    logger_1.logger.info(`${req.method} ${safePath}`, { requestId });
    next();
});
// Health check endpoint
app.get('/health', async (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/health', async (_req, res) => {
    let dbStatus = 'unknown';
    try {
        await exports.prisma.$queryRaw `SELECT 1`;
        dbStatus = 'connected';
    }
    catch {
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
app.use('/api/auth', authLimiter, auth_routes_1.default);
app.use('/api/ai', aiLimiter, ai_routes_1.default);
app.use('/api/projects', project_routes_1.default);
app.use('/api/documents', document_routes_1.default);
app.use('/api/search', search_routes_1.default);
app.use('/api/export', export_routes_1.default);
app.use('/api/chats', chat_routes_1.default);
app.use('/api/payments', payment_routes_1.default);
app.use('/api/storage', storage_routes_1.default);
app.use('/api/subscriptions', subscription_routes_1.default);
app.use('/api/dissertation', aiLimiter, dissertation_routes_1.default);
app.use('/api/images', image_routes_1.default);
app.use('/api/presentations', presentation_routes_1.default);
app.use('/api/citations', citations_routes_1.default);
app.use('/api/proxy', proxy_routes_1.default);
app.use('/api/usage', usage_routes_1.default);
app.use('/api/llm', aiLimiter, llmGateway_routes_1.default);
// Sentry error handler - must be before custom error handler
app.use((0, sentry_1.sentryErrorHandler)());
// Error handling middleware
app.use((err, _req, res, _next) => {
    logger_1.logger.error(`Error: ${err.message}`);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});
// 404 handler
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});
// Start server
const startServer = async () => {
    try {
        // Connect to database
        await exports.prisma.$connect();
        logger_1.logger.info('Connected to database');
        // Skip HTTP server in serverless environment (Vercel)
        if (process.env.VERCEL) {
            logger_1.logger.info('Running in Vercel serverless mode');
            return;
        }
        // Create HTTP server (local development only)
        const httpServer = (0, http_1.createServer)(app);
        // Initialize WebSocket
        (0, websocket_service_1.initWebSocket)(httpServer);
        httpServer.listen(PORT, () => {
            logger_1.logger.info(`🚀 Server running on http://localhost:${PORT}`);
            logger_1.logger.info(`📡 WebSocket server ready`);
            logger_1.logger.info(`📚 Scientific AI Assistant API ready`);
        });
        // Clean up expired refresh tokens every 6 hours
        setInterval(async () => {
            try {
                const count = await (0, tokens_1.cleanupExpiredTokens)();
                if (count > 0)
                    logger_1.logger.info(`Cleaned up ${count} expired refresh tokens`);
            }
            catch (e) {
                logger_1.logger.error('Token cleanup error:', e);
            }
        }, 6 * 60 * 60 * 1000);
    }
    catch (error) {
        logger_1.logger.error('Failed to start server:', error);
        if (!process.env.VERCEL) {
            process.exit(1);
        }
    }
};
// Graceful shutdown
const gracefulShutdown = async (signal) => {
    logger_1.logger.info(`${signal} received. Shutting down gracefully...`);
    await exports.prisma.$disconnect();
    process.exit(0);
};
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
// Global error handlers - prevent silent crashes
process.on('unhandledRejection', (reason) => {
    logger_1.logger.error('Unhandled Promise Rejection:', reason);
    sentry_1.Sentry.captureException(reason);
});
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught Exception:', error);
    sentry_1.Sentry.captureException(error);
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
exports.default = app;
module.exports = app;
//# sourceMappingURL=index.js.map