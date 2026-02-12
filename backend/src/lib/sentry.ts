/**
 * 🔍 Sentry Configuration for Backend
 * Error tracking and performance monitoring
 */

import * as Sentry from '@sentry/node';
import { Request, Response, NextFunction, Application } from 'express';

const SENTRY_DSN = process.env.SENTRY_DSN;

export function initSentry(_app: Application) {
  if (!SENTRY_DSN) {
    console.log('⚠️ Sentry DSN not configured, skipping initialization');
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
      const error = hint.originalException as Error;
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

  console.log('✅ Sentry initialized for backend');
}

// Request handler - add to app BEFORE routes
export function sentryRequestHandler() {
  return (_req: Request, _res: Response, next: NextFunction) => next();
}

// Error handler - add to app AFTER routes  
export function sentryErrorHandler() {
  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    if (SENTRY_DSN) {
      // Set user context if available
      if ((req as any).userId) {
        Sentry.setUser({ id: (req as any).userId });
      }
      // Capture the exception
      Sentry.captureException(err);
    }
    next(err);
  };
}

// Export Sentry for manual error capturing
export { Sentry };

// Helper to capture custom errors with context
export function captureError(error: Error, context?: Record<string, unknown>) {
  if (context) {
    Sentry.setContext('additional', context);
  }
  Sentry.captureException(error);
}

// Helper to add breadcrumb
export function addBreadcrumb(
  message: string, 
  category: string, 
  level: Sentry.SeverityLevel = 'info'
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
  });
}

// Helper to set user context
export function setUserContext(userId: string, email?: string) {
  Sentry.setUser({
    id: userId,
    email,
  });
}

// Helper to track transaction
export function startTransaction(name: string, op: string) {
  return Sentry.startInactiveSpan({ name, op });
}
