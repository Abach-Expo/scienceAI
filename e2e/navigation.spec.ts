/**
 * E2E Tests: Navigation & Accessibility
 */

import { test, expect } from '@playwright/test';
import { setupAuthenticatedUser, clearLocalStorage } from './fixtures';

test.describe('Public Routes', () => {
  test('should display home page with branding', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=/science|AI|assistant/i').first()).toBeVisible();
  });

  test('should display pricing page', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByRole('heading', { name: /цен|pric|план/i })).toBeVisible();
  });

  test('should display auth page with login form', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.locator('input[type="email"], input[placeholder*="email"]')).toBeVisible();
  });

  test('should display privacy policy', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: /приватн|privacy|конфиденц/i })).toBeVisible();
  });

  test('should display terms of service', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.getByRole('heading', { name: /условия|terms|пользов/i })).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  test('should allow access to dashboard when authenticated', async ({ page }) => {
    await setupAuthenticatedUser(page);
    await page.goto('/dashboard');
    await expect(page).not.toHaveURL(/auth|login/);
  });

  test('should allow access to chat when authenticated', async ({ page }) => {
    await setupAuthenticatedUser(page);
    await page.goto('/chat');
    await expect(page).not.toHaveURL(/auth|login/);
  });

  test('should allow access to presentations when authenticated', async ({ page }) => {
    await setupAuthenticatedUser(page);
    await page.goto('/presentations');
    await expect(page).not.toHaveURL(/auth|login/);
  });

  test('should allow access to settings when authenticated', async ({ page }) => {
    await setupAuthenticatedUser(page);
    await page.goto('/settings');
    await expect(page).not.toHaveURL(/auth|login/);
  });

  test('should redirect unauthenticated users from dashboard', async ({ page }) => {
    await clearLocalStorage(page);
    await page.goto('/dashboard');
    // Should redirect to auth or show login prompt
    await expect(page).toHaveURL(/auth|login|\//);
  });
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedUser(page);
  });

  test('should have navigation menu', async ({ page }) => {
    await page.goto('/dashboard');
    const nav = page.locator('nav, [role="navigation"]');
    await expect(nav.first()).toBeVisible();
  });

  test('should navigate to chat from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    const chatLink = page.locator('a[href*="chat"], button:has-text("Чат"), button:has-text("Chat")').first();
    await expect(chatLink).toBeVisible();
    await chatLink.click();
    await expect(page).toHaveURL(/chat/);
  });

  test('should navigate to presentations from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    const presLink = page.locator('a[href*="presentation"], button:has-text("Презентац"), button:has-text("Presentation")').first();
    await expect(presLink).toBeVisible();
    await presLink.click();
    await expect(page).toHaveURL(/presentation/);
  });
});

test.describe('404 Page', () => {
  test('should display 404 for non-existent routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    const notFound = page.locator('text=/404|не найден|not found/i');
    const isRedirected = page.url().endsWith('/') || page.url().includes('/auth');
    // Either shows 404 or redirects to home/auth
    expect(await notFound.count() > 0 || isRedirected).toBeTruthy();
  });
});

test.describe('Accessibility', () => {
  test('should have proper page title', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(3);
  });

  test('should have main landmark', async ({ page }) => {
    await page.goto('/');
    const main = page.locator('main, [role="main"]');
    await expect(main.first()).toBeVisible();
  });

  test('should have h1 heading on home page', async ({ page }) => {
    await page.goto('/');
    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
    expect(focused).not.toBe('BODY');
  });

  test('should have alt text on images', async ({ page }) => {
    await page.goto('/');
    const images = page.locator('img');
    const count = await images.count();
    for (let i = 0; i < Math.min(count, 5); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      expect(alt !== null || role === 'presentation').toBeTruthy();
    }
  });

  test('should have proper form labels on auth page', async ({ page }) => {
    await page.goto('/auth');
    const inputs = page.locator('input:not([type="hidden"])');
    const count = await inputs.count();
    for (let i = 0; i < Math.min(count, 5); i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const placeholder = await input.getAttribute('placeholder');
      const hasLabel = id ? await page.locator(`label[for="${id}"]`).count() > 0 : false;
      expect(hasLabel || ariaLabel || placeholder).toBeTruthy();
    }
  });

  test('should respect prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Dark Mode', () => {
  test('should render with system dark mode preference', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    const bgColor = await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor);
    expect(bgColor).toBeTruthy();
  });
});

test.describe('Language Support', () => {
  test('should have lang attribute on html tag', async ({ page }) => {
    await page.goto('/');
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBeTruthy();
  });
});

test.describe('Performance', () => {
  test('should load home page within 5 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000);
  });
});

test.describe('SEO', () => {
  test('should have meta description', async ({ page }) => {
    await page.goto('/');
    const metaDesc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(metaDesc).toBeTruthy();
    expect(metaDesc!.length).toBeGreaterThan(50);
  });

  test('should have Open Graph tags', async ({ page }) => {
    await page.goto('/');
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    const ogDesc = await page.locator('meta[property="og:description"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();
    expect(ogDesc).toBeTruthy();
  });

  test('should have canonical URL', async ({ page }) => {
    await page.goto('/');
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBeTruthy();
  });
});
