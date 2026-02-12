/**
 * Error Tracking & Analytics Utility
 * Lightweight error tracking for production monitoring
 */

interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userAgent: string;
  timestamp: string;
  userId?: string;
  extra?: Record<string, unknown>;
}

interface AnalyticsEvent {
  event: string;
  category: string;
  label?: string;
  value?: number;
  properties?: Record<string, unknown>;
}

// Queue for batching error reports
const errorQueue: ErrorReport[] = [];
const analyticsQueue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

// Get user ID if available
const getUserId = (): string | undefined => {
  try {
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed?.state?.user?.id;
    }
  } catch {
    // Ignore
  }
  return undefined;
};

/**
 * Report an error to tracking service
 */
export const reportError = (
  error: Error | string,
  extra?: Record<string, unknown>
): void => {
  const errorReport: ErrorReport = {
    message: typeof error === 'string' ? error : error.message,
    stack: typeof error === 'object' ? error.stack : undefined,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    userId: getUserId(),
    extra,
  };

  // Log to console in development
  if (import.meta.env.DEV) {
    console.error('[Error Tracking]', errorReport);
  }

  errorQueue.push(errorReport);
  scheduleFlush();
};

/**
 * Track analytics event
 */
export const trackEvent = (
  event: string,
  category: string,
  label?: string,
  value?: number,
  properties?: Record<string, unknown>
): void => {
  const analyticsEvent: AnalyticsEvent = {
    event,
    category,
    label,
    value,
    properties,
  };

  // Log to console in development
  if (import.meta.env.DEV) {
    console.log('[Analytics]', analyticsEvent);
  }

  analyticsQueue.push(analyticsEvent);
  
  // Send to Google Analytics if available
  if (typeof window.gtag === 'function') {
    window.gtag('event', event, {
      event_category: category,
      event_label: label,
      value: value,
      ...properties,
    });
  }

  scheduleFlush();
};

/**
 * Track page view
 */
export const trackPageView = (path: string, title?: string): void => {
  trackEvent('page_view', 'navigation', path);
  
  if (typeof window.gtag === 'function') {
    window.gtag('config', import.meta.env.VITE_GA_ID || '', {
      page_path: path,
      page_title: title,
    });
  }
};

/**
 * Schedule batch flush of queued events
 */
const scheduleFlush = (): void => {
  if (flushTimer) return;
  
  flushTimer = setTimeout(() => {
    flushQueues();
    flushTimer = null;
  }, 5000); // Batch every 5 seconds
};

/**
 * Flush queued events to server
 */
const flushQueues = async (): Promise<void> => {
  const errors = [...errorQueue];
  const analytics = [...analyticsQueue];
  
  errorQueue.length = 0;
  analyticsQueue.length = 0;

  if (errors.length === 0 && analytics.length === 0) return;

  try {
    // Send to backend if endpoint exists
    const API_URL = import.meta.env.VITE_API_URL || '';
    if (API_URL) {
      await fetch(`${API_URL}/api/analytics/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errors, analytics }),
        keepalive: true, // Ensure request completes even on page unload
      }).catch(() => {
        // Silently fail in production
      });
    }
  } catch {
    // Silently fail
  }
};

/**
 * Setup global error handlers
 */
export const setupErrorTracking = (): void => {
  // Unhandled errors
  window.onerror = (message, source, lineno, colno, error) => {
    reportError(error || String(message), {
      source,
      lineno,
      colno,
    });
    return false;
  };

  // Unhandled promise rejections
  window.onunhandledrejection = (event) => {
    reportError(event.reason || 'Unhandled Promise Rejection', {
      type: 'unhandledrejection',
    });
  };

  // Flush on page hide
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushQueues();
    }
  });

  // Flush on beforeunload
  window.addEventListener('beforeunload', () => {
    flushQueues();
  });
};

// TypeScript declaration for gtag
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export default {
  reportError,
  trackEvent,
  trackPageView,
  setupErrorTracking,
};
