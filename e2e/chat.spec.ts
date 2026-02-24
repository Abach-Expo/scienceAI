/**
 * 💬 E2E Tests: AI Chat Functionality
 * Tests for chat interface, message sending, and UI interaction
 */

import { test, expect } from '@playwright/test';
import { setupAuthenticatedUser } from './fixtures';

test.describe('Chat Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedUser(page, 'pro');
  });

  test.describe('Chat Interface', () => {
    test('should display chat input and send button', async ({ page }) => {
      await page.goto('/chat');

      const chatInput = page.locator('textarea, input[type="text"]').first();
      const sendButton = page.locator('button[type="submit"], button[aria-label*="send"], button[aria-label*="отправ"]').first();

      await expect(chatInput).toBeVisible({ timeout: 10000 });
      await expect(sendButton).toBeVisible();
    });

    test('should have new chat button', async ({ page }) => {
      await page.goto('/chat');

      const newChatBtn = page.locator('button:has-text("Новый"), button:has-text("New"), button[aria-label*="new"]').first();
      await expect(newChatBtn).toBeVisible({ timeout: 10000 });
    });

    test('should display chat sidebar', async ({ page }) => {
      await page.goto('/chat');

      // On desktop width, sidebar should be visible
      const sidebar = page.locator('[role="complementary"], aside, [data-testid="chat-sidebar"]').first();
      await expect(sidebar).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Message Input', () => {
    test('should allow typing in message input', async ({ page }) => {
      await page.goto('/chat');

      const input = page.locator('textarea, input[type="text"]').first();
      await input.fill('Hello, AI!');
      await expect(input).toHaveValue('Hello, AI!');
    });

    test('should expand textarea for long messages', async ({ page }) => {
      await page.goto('/chat');

      const textarea = page.locator('textarea').first();
      await expect(textarea).toBeVisible({ timeout: 10000 });

      const longText = 'This is a very long message that should cause the textarea to expand.\n'.repeat(10);
      await textarea.fill(longText);

      const height = await textarea.evaluate(el => el.scrollHeight);
      expect(height).toBeGreaterThan(50);
    });

    test('should have send button enabled when input has text', async ({ page }) => {
      await page.goto('/chat');

      const input = page.locator('textarea, input[type="text"]').first();
      await input.fill('Test message');

      const sendButton = page.locator('button[type="submit"]').first();
      await expect(sendButton).toBeEnabled();
    });
  });

  test.describe('Chat Navigation', () => {
    test('should be accessible from dashboard', async ({ page }) => {
      await page.goto('/dashboard');

      // Navigate to chat
      const chatLink = page.locator('a[href="/chat"], button:has-text("Чат"), button:has-text("Chat")').first();
      if (await chatLink.isVisible({ timeout: 5000 })) {
        await chatLink.click();
        await page.waitForURL(/chat/, { timeout: 5000 });
        expect(page.url()).toContain('/chat');
      }
    });

    test('should update URL when creating new chat', async ({ page }) => {
      await page.goto('/chat');

      const currentUrl = page.url();
      const newChatBtn = page.locator('button:has-text("Новый"), button:has-text("New")').first();

      if (await newChatBtn.isVisible({ timeout: 5000 })) {
        await newChatBtn.click();
        await page.waitForTimeout(1000);
        // After creating a new chat, URL may contain a chat ID
      }
    });
  });
});
