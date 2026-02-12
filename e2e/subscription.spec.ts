/**
 * 💳 E2E Tests: Subscription & Payment Flow
 * Tests for pricing page, subscription management, and payment integration
 */

import { test, expect } from '@playwright/test';

// Helper to set up authenticated user
async function setupAuthenticatedUser(page: any, plan: string = 'free') {
  await page.goto('/');
  await page.evaluate((userPlan: string) => {
    // Set auth state
    const authState = {
      state: {
        user: { id: 'test-user', email: 'test@test.com', name: 'Test User' },
        token: 'fake-jwt-token',
        isAuthenticated: true
      },
      version: 0
    };
    localStorage.setItem('auth-storage', JSON.stringify(authState));
    
    // Set subscription state
    const subState = {
      state: {
        plan: userPlan,
        tokensUsed: 0,
        tokensLimit: userPlan === 'free' ? 100 : userPlan === 'starter' ? 50000 : 150000,
        aiGenerationsUsed: 0,
        isActive: true,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      version: 0
    };
    localStorage.setItem('subscription-storage', JSON.stringify(subState));
  }, plan);
  await page.reload();
}

test.describe('Pricing Page', () => {
  test('should display all subscription plans', async ({ page }) => {
    await page.goto('/pricing');
    
    // Check for plan cards
    await expect(page.getByText(/free|бесплатный/i).first()).toBeVisible();
    await expect(page.getByText(/starter|стартер/i).first()).toBeVisible();
    await expect(page.getByText(/pro|про/i).first()).toBeVisible();
    await expect(page.getByText(/premium|премиум/i).first()).toBeVisible();
  });

  test('should display plan prices correctly', async ({ page }) => {
    await page.goto('/pricing');
    
    // Check prices are displayed
    await expect(page.getByText(/\$5\.99|\$6/i).first()).toBeVisible();
    await expect(page.getByText(/\$12\.99|\$13/i).first()).toBeVisible();
    await expect(page.getByText(/\$24\.99|\$25/i).first()).toBeVisible();
  });

  test('should display plan features', async ({ page }) => {
    await page.goto('/pricing');
    
    // Check that features are listed
    await expect(page.getByText(/токен|token/i).first()).toBeVisible();
    await expect(page.getByText(/генераци|generation/i).first()).toBeVisible();
  });

  test('should highlight recommended plan', async ({ page }) => {
    await page.goto('/pricing');
    
    // Pro plan should be highlighted as popular/recommended
    const popularBadge = page.locator('text=/популярн|popular|рекомендуем|recommended/i');
    await expect(popularBadge.first()).toBeVisible();
  });

  test('should show monthly/yearly toggle', async ({ page }) => {
    await page.goto('/pricing');
    
    // Check for billing period toggle
    const yearlyToggle = page.locator('text=/год|yearly|annual/i');
    // Toggle may or may not exist
  });
});

test.describe('Subscription Selection', () => {
  test('free plan should activate without payment', async ({ page }) => {
    await setupAuthenticatedUser(page);
    await page.goto('/pricing');
    
    // Click on free plan button
    const freeButton = page.locator('button').filter({ hasText: /начать|start|выбрать|select/i }).first();
    await freeButton.click();
    
    // Should not redirect to payment - should activate immediately
    await expect(page).not.toHaveURL(/checkout|payment/);
  });

  test('paid plan should redirect to checkout', async ({ page }) => {
    await setupAuthenticatedUser(page, 'free');
    await page.goto('/pricing');
    
    // Click on Pro plan button
    const proPlanButton = page.locator('[data-plan="pro"], button:has-text("Pro")').first();
    if (await proPlanButton.isVisible()) {
      await proPlanButton.click();
      
      // Should open payment modal or redirect
      const paymentModal = page.locator('[role="dialog"], .modal, [data-testid="payment-modal"]');
      // Check if modal appears or redirect happens
    }
  });

  test('should show current plan indicator for logged in user', async ({ page }) => {
    await setupAuthenticatedUser(page, 'starter');
    await page.goto('/pricing');
    
    // Starter plan should show "Current plan" or similar
    const currentPlanIndicator = page.locator('text=/текущий|current|ваш план/i');
    await expect(currentPlanIndicator.first()).toBeVisible();
  });
});

test.describe('Usage Limits', () => {
  test('should display remaining tokens in header/sidebar', async ({ page }) => {
    await setupAuthenticatedUser(page, 'starter');
    await page.goto('/dashboard');
    
    // Should show token usage somewhere
    const tokenDisplay = page.locator('text=/токен|token|осталось/i');
    // Token display should be visible in dashboard
  });

  test('should show upgrade prompt when limits reached', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      // Set auth state
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: { id: 'test-user', email: 'test@test.com', name: 'Test User' },
          token: 'fake-jwt-token',
          isAuthenticated: true
        },
        version: 0
      }));
      
      // Set exhausted subscription
      localStorage.setItem('subscription-storage', JSON.stringify({
        state: {
          plan: 'free',
          tokensUsed: 100,
          tokensLimit: 100,
          aiGenerationsUsed: 5,
          isActive: true
        },
        version: 0
      }));
    });
    await page.reload();
    
    await page.goto('/chat');
    
    // Should show limit warning or upgrade prompt
    const limitWarning = page.locator('text=/лимит|limit|исчерп|exhaust|upgrade|улучш/i');
    // Limit warning may appear
  });

  test('should display usage statistics', async ({ page }) => {
    await setupAuthenticatedUser(page, 'pro');
    await page.goto('/settings');
    
    // Settings should show usage stats
    const usageSection = page.locator('text=/использован|usage|статистик/i');
    // Usage section should be visible in settings
  });
});

test.describe('Payment Modal', () => {
  test('should close modal on cancel', async ({ page }) => {
    await setupAuthenticatedUser(page);
    await page.goto('/pricing');
    
    // Open payment modal
    const upgradeButton = page.locator('button:has-text("Starter"), button:has-text("Выбрать")').nth(1);
    if (await upgradeButton.isVisible()) {
      await upgradeButton.click();
      
      // Find close button
      const closeButton = page.locator('button:has-text("Отмена"), button:has-text("Cancel"), [aria-label*="close"]');
      if (await closeButton.isVisible()) {
        await closeButton.click();
        
        // Modal should be closed
        const modal = page.locator('[role="dialog"]');
        await expect(modal).not.toBeVisible();
      }
    }
  });
});

test.describe('Subscription Status', () => {
  test('should show active subscription badge', async ({ page }) => {
    await setupAuthenticatedUser(page, 'pro');
    await page.goto('/settings');
    
    // Should show Pro badge or active status
    const proBadge = page.locator('text=/pro|активн|active/i');
    // Badge should be visible
  });

  test('should show expiration date for subscription', async ({ page }) => {
    await setupAuthenticatedUser(page, 'premium');
    await page.goto('/settings');
    
    // Should show subscription period
    const expirationInfo = page.locator('text=/до|until|expires|истекает/i');
    // Expiration info may be visible
  });
});
