/**
 * 🔐 E2E Tests: Authentication Flow
 * Tests for login, registration, logout, and protected routes
 */

import { test, expect } from '@playwright/test';
import { setupAuthenticatedUser, clearLocalStorage } from './fixtures';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
  });

  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/auth');

      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const submitButton = page.locator('button[type="submit"]').first();

      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      await expect(submitButton).toBeVisible();
    });

    test('should show validation errors for empty fields', async ({ page }) => {
      await page.goto('/auth');

      await page.locator('button[type="submit"]').first().click();

      const errorMessage = page.locator('text=/email|почта|обязательн|required/i');
      await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/auth');

      await page.locator('input[type="email"]').first().fill('invalid@test.com');
      await page.locator('input[type="password"]').first().fill('wrongpassword123');
      await page.locator('button[type="submit"]').first().click();

      const errorMessage = page.locator('text=/ошибка|error|неверн|fail/i');
      await expect(errorMessage.first()).toBeVisible({ timeout: 10000 });
    });

    test('should toggle between login and register modes', async ({ page }) => {
      await page.goto('/auth');

      const registerToggle = page.locator('text=/регистрация|sign up|создать/i').first();
      await registerToggle.click();

      const nameInput = page.locator('input[placeholder*="имя"], input[placeholder*="name"], input[name="name"]').first();
      await expect(nameInput).toBeVisible({ timeout: 5000 });
    });

    test('should have password field with type password', async ({ page }) => {
      await page.goto('/auth');

      const passwordField = page.locator('input[type="password"]').first();
      await passwordField.fill('testpassword');
      await expect(passwordField).toHaveAttribute('type', 'password');
    });
  });

  test.describe('Registration', () => {
    test('should display registration form with all fields', async ({ page }) => {
      await page.goto('/auth?mode=register');

      await expect(page.locator('input[placeholder*="имя"], input[placeholder*="name"], input[name="name"]').first()).toBeVisible();
      await expect(page.locator('input[type="email"]').first()).toBeVisible();
      await expect(page.locator('input[type="password"]').first()).toBeVisible();
    });

    test('should validate password strength on submit', async ({ page }) => {
      await page.goto('/auth?mode=register');

      await page.locator('input[placeholder*="имя"], input[placeholder*="name"], input[name="name"]').first().fill('Test');
      await page.locator('input[type="email"]').first().fill('test@example.com');
      await page.locator('input[type="password"]').first().fill('123');
      await page.locator('button[type="submit"]').first().click();

      const warning = page.locator('text=/короткий|слабый|weak|short|минимум|minimum|characters|символ/i');
      await expect(warning.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Social Auth', () => {
    test('should display Google auth button', async ({ page }) => {
      await page.goto('/auth');

      const googleButton = page.locator('button:has-text("Google"), [aria-label*="Google"], div[id*="google"]').first();
      await expect(googleButton).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to auth when accessing dashboard without login', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForURL(/auth|login/, { timeout: 5000 });
      expect(page.url()).toMatch(/auth|login/);
    });

    test('should redirect to auth when accessing chat without login', async ({ page }) => {
      await page.goto('/chat');
      await page.waitForURL(/auth|login/, { timeout: 5000 });
      expect(page.url()).toMatch(/auth|login/);
    });

    test('should redirect to auth when accessing settings without login', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForURL(/auth|login/, { timeout: 5000 });
      expect(page.url()).toMatch(/auth|login/);
    });
  });
});

test.describe('Session Management', () => {
  test('should persist login state after page refresh', async ({ page }) => {
    await setupAuthenticatedUser(page, 'pro');

    await page.goto('/dashboard');
    await page.reload();
    await page.waitForTimeout(2000);

    // Should still be on dashboard, not redirected to auth
    expect(page.url()).not.toMatch(/auth|login/);
  });

  test('should allow access to protected routes when authenticated', async ({ page }) => {
    await setupAuthenticatedUser(page, 'pro');

    await page.goto('/chat');
    await page.waitForTimeout(2000);

    expect(page.url()).not.toMatch(/auth|login/);
    expect(page.url()).toContain('/chat');
  });
});
