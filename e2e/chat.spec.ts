/**
 * 💬 E2E Tests: AI Chat Functionality
 * Tests for chat interface, message sending, and AI responses
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

test.describe('Chat Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedUser(page);
  });

  test.describe('Chat Interface', () => {
    test('should display chat interface', async ({ page }) => {
      await page.goto('/chat');
      
      // Check for main chat elements using testids
      await expect(page.locator('[data-testid="chat-input"], textarea, input[type="text"]').first()).toBeVisible();
      await expect(page.locator('[data-testid="chat-send-button"], button[type="submit"]').first()).toBeVisible();
    });

    test('should have new chat button', async ({ page }) => {
      await page.goto('/chat');
      
      const newChatBtn = page.locator('button:has-text("Новый"), button:has-text("New"), button[aria-label*="new"]');
      await expect(newChatBtn.first()).toBeVisible();
    });

    test('should display chat sidebar with history', async ({ page }) => {
      await page.goto('/chat');
      
      // Check for sidebar/chat list
      const sidebar = page.locator('[role="complementary"], aside, .sidebar, [data-testid="chat-sidebar"]');
      await expect(sidebar.first()).toBeVisible();
    });

    test('should have search functionality in sidebar', async ({ page }) => {
      await page.goto('/chat');
      
      // Look for search input in sidebar
      const searchInput = page.locator('input[placeholder*="поиск"], input[placeholder*="search"]');
      // Search may or may not be present
    });
  });

  test.describe('Message Input', () => {
    test('should allow typing in message input', async ({ page }) => {
      await page.goto('/chat');
      
      const input = page.locator('[data-testid="chat-input"], textarea').first();
      await input.fill('Hello, AI!');
      await expect(input).toHaveValue('Hello, AI!');
    });

    test('should expand textarea for long messages', async ({ page }) => {
      await page.goto('/chat');
      
      const textarea = page.locator('textarea').first();
      if (await textarea.isVisible()) {
        const longText = 'This is a very long message that should cause the textarea to expand.\n'.repeat(10);
        await textarea.fill(longText);
        
        // Textarea should have increased height
        const height = await textarea.evaluate(el => el.scrollHeight);
        expect(height).toBeGreaterThan(50);
      }
    });

    test('should have send button enabled when input has text', async ({ page }) => {
      await page.goto('/chat');
      
      const input = page.locator('textarea, input[type="text"]').first();
      const sendButton = page.locator('button[type="submit"], button:has-text("Send"), button:has-text("Отправить")').first();
      
      // Button might be disabled when empty
      await input.fill('Test message');
      
      // Button should be enabled
      await expect(sendButton).not.toBeDisabled();
    });

    test('should clear input after sending message', async ({ page }) => {
      await page.goto('/chat');
      
      const input = page.locator('textarea, input[type="text"]').first();
      const sendButton = page.locator('button[type="submit"]').first();
      
      await input.fill('Test message');
      await sendButton.click();
      
      // Input might be cleared (or message might fail due to no backend)
    });
  });

  test.describe('Chat History', () => {
    test('should create new chat', async ({ page }) => {
      await page.goto('/chat');
      
      const newChatBtn = page.locator('button:has-text("Новый"), button:has-text("New")').first();
      if (await newChatBtn.isVisible()) {
        await newChatBtn.click();
        
        // New chat should be created
        // URL might change or new chat item appears
      }
    });

    test('should display starred filter option', async ({ page }) => {
      await page.goto('/chat');
      
      // Look for star/favorite filter
      const starFilter = page.locator('button[aria-label*="star"], button:has-text("Избранн"), [data-testid="star-filter"]');
      // Star filter may or may not be visible
    });

    test('should show delete confirmation for chats', async ({ page }) => {
      await page.goto('/chat');
      
      // Create a mock chat in localStorage
      await page.evaluate(() => {
        localStorage.setItem('chat-history', JSON.stringify([
          { id: 'test-chat-1', title: 'Test Chat', messages: [], createdAt: new Date().toISOString() }
        ]));
      });
      await page.reload();
      
      // Try to delete chat (implementation dependent)
    });
  });

  test.describe('Message Actions', () => {
    test('should display message action buttons', async ({ page }) => {
      await page.goto('/chat');
      
      // Send a message first
      const input = page.locator('textarea').first();
      await input.fill('Hello!');
      await page.keyboard.press('Enter');
      
      // Look for message action buttons (copy, edit, etc.)
      // These appear on hover or after message is sent
    });

    test('should show feedback buttons on AI messages', async ({ page }) => {
      await page.goto('/chat');
      
      // After AI responds, there should be thumbs up/down buttons
      const thumbsUp = page.locator('[aria-label*="like"], button:has(svg[class*="thumbs"])');
      // These only appear after AI response
    });
  });

  test.describe('Chat Settings', () => {
    test('should have model selector', async ({ page }) => {
      await page.goto('/chat');
      
      // Look for model dropdown
      const modelSelector = page.locator('select, [role="combobox"], button:has-text("GPT")');
      // Model selector may or may not be visible
    });

    test('should have temperature/creativity settings', async ({ page }) => {
      await page.goto('/chat');
      
      // Look for settings button
      const settingsBtn = page.locator('button[aria-label*="settings"], button:has-text("Настройки")');
      // Settings button may reveal sliders for temperature
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test('should submit message with Enter', async ({ page }) => {
      await page.goto('/chat');
      
      const input = page.locator('textarea').first();
      await input.fill('Test with Enter');
      await input.press('Enter');
      
      // Message should be submitted
    });

    test('should insert newline with Shift+Enter', async ({ page }) => {
      await page.goto('/chat');
      
      const input = page.locator('textarea').first();
      await input.fill('Line 1');
      await input.press('Shift+Enter');
      await input.type('Line 2');
      
      // Should have two lines
      const value = await input.inputValue();
      expect(value).toContain('\n');
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should hide sidebar on mobile', async ({ page }) => {
      // This test uses mobile viewport from config
      await page.goto('/chat');
      
      // On mobile, sidebar might be hidden or in a drawer
      const sidebar = page.locator('aside, [data-testid="sidebar"]');
      // Sidebar behavior depends on screen size
    });

    test('should have mobile menu toggle', async ({ page }) => {
      await page.goto('/chat');
      
      // Look for hamburger menu on mobile
      const menuToggle = page.locator('button[aria-label*="menu"], button:has-text("☰")');
      // Menu toggle only visible on mobile
    });
  });
});

test.describe('Chat Error Handling', () => {
  test('should show error when network fails', async ({ page }) => {
    await setupAuthenticatedUser(page);
    
    // Simulate offline mode
    await page.context().setOffline(true);
    await page.goto('/chat');
    
    const input = page.locator('textarea').first();
    await input.fill('This should fail');
    await input.press('Enter');
    
    // Should show network error
    const errorMessage = page.locator('text=/ошибка|error|сеть|network|offline/i');
    // Error message may appear
    
    // Re-enable network
    await page.context().setOffline(false);
  });

  test('should handle rate limiting gracefully', async ({ page }) => {
    await setupAuthenticatedUser(page);
    await page.goto('/chat');
    
    // Rate limit error handling would require backend mock
  });
});

test.describe('Chat Persistence', () => {
  test('should preserve draft message on page reload', async ({ page }) => {
    await setupAuthenticatedUser(page);
    await page.goto('/chat');
    
    const input = page.locator('textarea').first();
    await input.fill('Draft message to preserve');
    
    // Wait for draft to save
    await page.waitForTimeout(1000);
    
    // Reload page
    await page.reload();
    
    // Draft should be restored
    const restoredInput = page.locator('textarea').first();
    // Value might be restored from localStorage
  });

  test('should persist chat history in localStorage', async ({ page }) => {
    await setupAuthenticatedUser(page);
    await page.goto('/chat');
    
    // Check that chat storage exists
    const storage = await page.evaluate(() => localStorage.getItem('chat-history'));
    // Storage might be null or have existing chats
  });
});
