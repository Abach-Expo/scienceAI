"use strict";
/**
 * 🔍 Sentry Configuration for Backend
 * Error tracking and performance monitoring
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sentry = void 0;
exports.initSentry = initSentry;
exports.sentryRequestHandler = sentryRequestHandler;
exports.sentryErrorHandler = sentryErrorHandler;
exports.captureError = captureError;
exports.addBreadcrumb = addBreadcrumb;
exports.setUserContext = setUserContext;
exports.startTransaction = startTransaction;
const Sentry = __importStar(require("@sentry/node"));
exports.Sentry = Sentry;
const logger_1 = require("../utils/logger");
const SENTRY_DSN = process.env.SENTRY_DSN;
function initSentry(_app) {
    if (!SENTRY_DSN) {
        logger_1.logger.info('Sentry DSN not configured, skipping initialization');
        return;
    }
    Sentry.init({
        dsn: SENTRY_DSN,
        // Environment
        environment: process.env.NODE_ENV || 'development',
        // Release version
        release: `science-ai-backend@${process.env.npm_package_version || '1.0.0'}`,
        // Integrations
        integrations: [
            // HTTP integration for tracking requests
            Sentry.httpIntegration(),
            // Express integration
            Sentry.expressIntegration(),
        ],
        // Performance monitoring
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
        // Profile sampling (for Node.js performance profiling)
        profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
        // Filter sensitive data
        beforeSend(event, hint) {
            // Remove sensitive headers
            if (event.request?.headers) {
                delete event.request.headers.authorization;
                delete event.request.headers.cookie;
            }
            // Don't send events for expected errors
            const error = hint.originalException;
            if (error?.message?.includes('jwt expired') ||
                error?.message?.includes('Unauthorized') ||
                error?.message?.includes('Rate limit')) {
                return null;
            }
            return event;
        },
        // Ignore specific errors
        ignoreErrors: [
            'jwt expired',
            'jwt malformed',
            'invalid token',
            'Rate limit exceeded',
            'ECONNREFUSED',
            'ENOTFOUND',
        ],
    });
    logger_1.logger.info('Sentry initialized for backend');
}
// Request handler - add to app BEFORE routes
function sentryRequestHandler() {
    return (_req, _res, next) => next();
}
// Error handler - add to app AFTER routes  
function sentryErrorHandler() {
    return (err, req, res, next) => {
        if (SENTRY_DSN) {
            // Set user context if available
            if (req.userId) {
                Sentry.setUser({ id: req.userId });
            }
            // Capture the exception
            Sentry.captureException(err);
        }
        next(err);
    };
}
// Helper to capture custom errors with context
function captureError(error, context) {
    if (context) {
        Sentry.setContext('additional', context);
    }
    Sentry.captureException(error);
}
// Helper to add breadcrumb
function addBreadcrumb(message, category, level = 'info') {
    Sentry.addBreadcrumb({
        message,
        category,
        level,
    });
}
// Helper to set user context
function setUserContext(userId, email) {
    Sentry.setUser({
        id: userId,
        email,
    });
}
// Helper to track transaction
function startTransaction(name, op) {
    return Sentry.startInactiveSpan({ name, op });
}
//# sourceMappingURL=sentry.js.map