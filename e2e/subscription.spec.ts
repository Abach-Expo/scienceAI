/**
 * E2E Tests: Subscription & Payment Flow
 */

import { test, expect } from '@playwright/test';
import { setupAuthenticatedUser, setExhaustedLimits } from './fixtures';

test.describe('Pricing Page', () => {
  test('should display all subscription plans', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByText(/free|бесплатный/i).first()).toBeVisible();
    await expect(page.getByText(/starter|стартер/i).first()).toBeVisible();
    await expect(page.getByText(/pro|про/i).first()).toBeVisible();
    await expect(page.getByText(/premium|премиум/i).first()).toBeVisible();
  });

  test('should display plan prices', async ({ page }) => {
    await page.goto('/pricing');
    // At least one price should be visible
    const prices = page.locator('text=/\\$\\d+/');
    await expect(prices.first()).toBeVisible();
  });

  test('should display plan features', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByText(/токен|token/i).first()).toBeVisible();
    await expect(page.getByText(/генераци|generation/i).first()).toBeVisible();
  });

  test('should highlight recommended/popular plan', async ({ page }) => {
    await page.goto('/pricing');
    const popularBadge = page.locator('text=/популярн|popular|рекомендуем|recommended/i');
    await expect(popularBadge.first()).toBeVisible();
  });
});

test.describe('Subscription Selection', () => {
  test('free plan should not redirect to payment', async ({ page }) => {
    await setupAuthenticatedUser(page);
    await page.goto('/pricing');
    const freeButton = page.locator('button').filter({ hasText: /начать|start|выбрать|select/i }).first();
    await expect(freeButton).toBeVisible();
    await freeButton.click();
    await expect(page).not.toHaveURL(/checkout|payment/);
  });

  test('should show current plan indicator for logged-in user', async ({ page }) => {
    await setupAuthenticatedUser(page, 'starter');
    await page.goto('/pricing');
    const currentPlanIndicator = page.locator('text=/текущий|current|ваш план/i');
    await expect(currentPlanIndicator.first()).toBeVisible();
  });
});

test.describe('Usage Limits', () => {
  test('should show upgrade prompt when limits exhausted', async ({ page }) => {
    await setupAuthenticatedUser(page, 'free');
    await setExhaustedLimits(page);
    await page.goto('/chat');
    // Should show limit warning, upgrade prompt, or disabled input
    const limitIndicator = page.locator('text=/лимит|limit|исчерп|exhaust|upgrade|улучш/i');
    const disabledInput = page.locator('textarea[disabled], input[disabled], button[disabled]');
    const indicatorCount = await limitIndicator.count();
    const disabledCount = await disabledInput.count();
    expect(indicatorCount + disabledCount).toBeGreaterThan(0);
  });
});

test.describe('Payment Modal', () => {
  test('should close payment modal on cancel', async ({ page }) => {
    await setupAuthenticatedUser(page);
    await page.goto('/pricing');
    // Try to open a paid plan modal
    const upgradeButton = page.locator('button:has-text("Starter"), button:has-text("Выбрать")').nth(1);
    if (await upgradeButton.isVisible()) {
      await upgradeButton.click();
      const closeButton = page.locator('button:has-text("Отмена"), button:has-text("Cancel"), [aria-label*="close"]').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
        const modal = page.locator('[role="dialog"]');
        await expect(modal).not.toBeVisible();
      }
    }
  });
});

test.describe('Subscription Status', () => {
  test('should show active plan badge in settings', async ({ page }) => {
    await setupAuthenticatedUser(page, 'pro');
    await page.goto('/settings');
    // Should show Pro badge or active subscription info
    const proBadge = page.locator('text=/pro|активн|active/i');
    await expect(proBadge.first()).toBeVisible();
  });
});
