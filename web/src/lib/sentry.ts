/**
 * 🔍 Sentry Configuration for Frontend
 * Error tracking and performance monitoring
 */

import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (!SENTRY_DSN) {
    if (import.meta.env.DEV) console.log('Sentry DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Environment
    environment: import.meta.env.MODE,
    
    // Release version
    release: `science-ai-web@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
    
    // Integrations
    integrations: [
      // Browser tracing for performance
      Sentry.browserTracingIntegration(),
      // Replay for session recording on errors
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    
    // Performance monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    
    // Session replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Filter out known non-critical errors
    beforeSend(event, hint) {
      const error = hint.originalException as Error;
      
      // Ignore network errors during development
      if (!import.meta.env.PROD) {
        if (error?.message?.includes('fetch failed') || 
            error?.message?.includes('NetworkError')) {
          return null;
        }
      }
      
      // Ignore aborted requests
      if (error?.name === 'AbortError') {
        return null;
      }
      
      // Add user context if available
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        try {
          const auth = JSON.parse(authStorage);
          if (auth.state?.user) {
            Sentry.setUser({
              id: auth.state.user.id,
              email: auth.state.user.email,
            });
          }
        } catch {
          // Ignore parse errors
        }
      }
      
      return event;
    },
    
    // Ignore specific error patterns
    ignoreErrors: [
      // Browser extensions
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
      // Common third-party issues
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // Network issues
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      // User cancellations
      'AbortError',
      'The user aborted a request',
    ],
    
    // Don't send PII
    sendDefaultPii: false,
  });

  if (import.meta.env.DEV) console.log('✅ Sentry initialized');
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
export function setUserContext(user: { id: string; email: string; plan?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
  });
  if (user.plan) {
    Sentry.setTag('subscription_plan', user.plan);
  }
}

// Helper to clear user context on logout
export function clearUserContext() {
  Sentry.setUser(null);
}
