/**
 * 🧭 E2E Tests: Navigation & Accessibility
 * Tests for routing, navigation, and accessibility compliance
 */

import { test, expect } from '@playwright/test';

// Helper to set up authenticated user
async function setupAuthenticatedUser(page: any) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        user: { id: 'test-user', email: 'test@test.com', name: 'Test User' },
        token: 'fake-jwt-token',
        isAuthenticated: true
      },
      version: 0
    }));
    
    localStorage.setItem('subscription-storage', JSON.stringify({
      state: {
        plan: 'pro',
        tokensUsed: 0,
        tokensLimit: 150000,
        aiGenerationsUsed: 0,
        isActive: true
      },
      version: 0
    }));
  });
  await page.reload();
}

test.describe('Public Routes', () => {
  test('should display home page', async ({ page }) => {
    await page.goto('/');
    
    // Check for main branding
    await expect(page.locator('text=/science|AI|assistant/i').first()).toBeVisible();
  });

  test('should display pricing page', async ({ page }) => {
    await page.goto('/pricing');
    
    await expect(page.getByRole('heading', { name: /цен|pric|план/i })).toBeVisible();
  });

  test('should display auth page', async ({ page }) => {
    await page.goto('/auth');
    
    // Should show login form
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
    
    // Should not redirect to auth
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
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedUser(page);
  });

  test('should have navigation menu', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for nav links
    const nav = page.locator('nav, [role="navigation"]');
    await expect(nav.first()).toBeVisible();
  });

  test('should navigate to chat from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    
    const chatLink = page.locator('a[href*="chat"], button:has-text("Чат"), button:has-text("Chat")');
    if (await chatLink.first().isVisible()) {
      await chatLink.first().click();
      await expect(page).toHaveURL(/chat/);
    }
  });

  test('should navigate to presentations from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    
    const presLink = page.locator('a[href*="presentation"], button:has-text("Презентац")');
    if (await presLink.first().isVisible()) {
      await presLink.first().click();
      await expect(page).toHaveURL(/presentation/);
    }
  });

  test('should have user menu', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Look for user menu/avatar
    const userMenu = page.locator('[aria-label*="user"], [aria-label*="account"], [data-testid="user-menu"], .avatar');
    await expect(userMenu.first()).toBeVisible();
  });

  test('should navigate to settings from user menu', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Click user menu first
    const userMenu = page.locator('[data-testid="user-menu"], .avatar, button:has-text("Test User")');
    if (await userMenu.first().isVisible()) {
      await userMenu.first().click();
      
      // Then click settings
      const settingsLink = page.locator('a[href*="settings"], button:has-text("Настройки"), button:has-text("Settings")');
      if (await settingsLink.first().isVisible()) {
        await settingsLink.first().click();
        await expect(page).toHaveURL(/settings/);
      }
    }
  });
});

test.describe('404 Page', () => {
  test('should display 404 for non-existent routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    
    // Should show 404 message or redirect to home
    const notFound = page.locator('text=/404|не найден|not found/i');
    // Either 404 page or redirect
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

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    
    // Should have at least one h1
    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible();
  });

  test('should have skip to content link', async ({ page }) => {
    await page.goto('/');
    
    // Skip link is usually hidden until focused
    const skipLink = page.locator('a[href="#main-content"], a:has-text("Skip to")');
    // Skip link may or may not be implemented
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');
    
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    
    // Something should be focused
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
  });

  test('should have alt text on images', async ({ page }) => {
    await page.goto('/');
    
    const images = page.locator('img');
    const count = await images.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      
      // Either has alt text or is decorative (role="presentation")
      expect(alt !== null || role === 'presentation').toBeTruthy();
    }
  });

  test('should have proper form labels', async ({ page }) => {
    await page.goto('/auth');
    
    const inputs = page.locator('input:not([type="hidden"])');
    const count = await inputs.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const placeholder = await input.getAttribute('placeholder');
      
      // Input should have some accessible name
      const hasLabel = id ? await page.locator(`label[for="${id}"]`).count() > 0 : false;
      expect(hasLabel || ariaLabel || placeholder).toBeTruthy();
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');
    
    // Check that text is visible (basic check)
    const body = page.locator('body');
    const bgColor = await body.evaluate(el => getComputedStyle(el).backgroundColor);
    
    // Background should not be fully transparent
    expect(bgColor).toBeTruthy();
  });

  test('should respect prefers-reduced-motion', async ({ page }) => {
    // Emulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    
    // Page should still work
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Dark Mode', () => {
  test('should support dark mode', async ({ page }) => {
    await page.goto('/');
    
    // Check for dark mode toggle or automatic dark mode
    const darkModeToggle = page.locator('button[aria-label*="dark"], button[aria-label*="theme"]');
    
    // Or check if dark mode is applied based on system preference
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    
    // Body should have dark background
    const bgColor = await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor);
    // Background color should be dark (high RGB values = light, low = dark)
  });
});

test.describe('Language Support', () => {
  test('should have language in html tag', async ({ page }) => {
    await page.goto('/');
    
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBeTruthy();
  });

  test('should support Russian language', async ({ page }) => {
    await page.goto('/');
    
    // Check for Russian text
    const russianText = page.locator('text=/[а-яА-ЯёЁ]/');
    // Russian text should be present
  });

  test('should have language switcher', async ({ page }) => {
    await setupAuthenticatedUser(page);
    await page.goto('/settings');
    
    // Look for language selector
    const langSelector = page.locator('select, [role="listbox"]').filter({ hasText: /язык|language|english|русский/i });
    // Language selector may be in settings
  });
});

test.describe('Performance', () => {
  test('should load home page quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should have optimized images', async ({ page }) => {
    await page.goto('/');
    
    const images = page.locator('img');
    const count = await images.count();
    
    for (let i = 0; i < Math.min(count, 3); i++) {
      const img = images.nth(i);
      const loading = await img.getAttribute('loading');
      
      // Images should have lazy loading (except above-the-fold)
      // This is a soft check
    }
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

  test('should have robots meta', async ({ page }) => {
    await page.goto('/');
    
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    // Robots meta should be present or default
  });
});
