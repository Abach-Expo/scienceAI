/**
 * Analytics Hooks
 * Track page views and user interactions
 */

import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent, trackPageView } from '../utils/errorTracking';

/**
 * Track page views automatically on route change
 */
export function usePageTracking(): void {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname, document.title);
  }, [location.pathname]);
}

/**
 * Track user interactions
 */
export function useAnalytics() {
  const track = useCallback(
    (
      eventName: string,
      category: string,
      label?: string,
      value?: number,
      properties?: Record<string, unknown>
    ) => {
      trackEvent(eventName, category, label, value, properties);
    },
    []
  );

  const trackClick = useCallback(
    (buttonName: string, context?: string) => {
      track('click', 'button', buttonName, undefined, { context });
    },
    [track]
  );

  const trackGeneration = useCallback(
    (type: string, success: boolean, duration?: number) => {
      track('generation', 'ai', type, duration, { success });
    },
    [track]
  );

  const trackExport = useCallback(
    (format: string, documentType: string) => {
      track('export', 'document', format, undefined, { documentType });
    },
    [track]
  );

  const trackSubscription = useCallback(
    (action: 'view' | 'select' | 'purchase', planId: string) => {
      track('subscription', action, planId);
    },
    [track]
  );

  const trackError = useCallback(
    (errorType: string, message: string) => {
      track('error', 'user_facing', errorType, undefined, { message });
    },
    [track]
  );

  return {
    track,
    trackClick,
    trackGeneration,
    trackExport,
    trackSubscription,
    trackError,
  };
}

/**
 * Track time spent on page
 */
export function useTimeOnPage(pageName: string): void {
  useEffect(() => {
    const startTime = Date.now();

    return () => {
      const timeSpent = Math.round((Date.now() - startTime) / 1000);
      if (timeSpent > 5) {
        trackEvent('time_on_page', 'engagement', pageName, timeSpent);
      }
    };
  }, [pageName]);
}

/**
 * Track scroll depth
 */
export function useScrollTracking(thresholds: number[] = [25, 50, 75, 100]): void {
  useEffect(() => {
    const tracked = new Set<number>();

    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((window.scrollY / scrollHeight) * 100);

      thresholds.forEach((threshold) => {
        if (scrollPercent >= threshold && !tracked.has(threshold)) {
          tracked.add(threshold);
          trackEvent('scroll_depth', 'engagement', `${threshold}%`, threshold);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [thresholds]);
}
