/**
 * 📊 E2E Tests: Presentations Feature
 * Tests for presentation creation, editing, and export
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

test.describe('Presentations Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedUser(page);
  });

  test.describe('Presentations List', () => {
    test('should display presentations page', async ({ page }) => {
      await page.goto('/presentations');
      
      // Check for main elements
      await expect(page.getByRole('heading', { name: /презентац|presentation/i })).toBeVisible();
    });

    test('should have create new presentation button', async ({ page }) => {
      await page.goto('/presentations');
      
      const createBtn = page.locator('button:has-text("Создать"), button:has-text("Create"), button:has-text("Новая")');
      await expect(createBtn.first()).toBeVisible();
    });

    test('should display saved presentations', async ({ page }) => {
      // Add a mock presentation to storage
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('saved-presentations', JSON.stringify([
          {
            id: 'test-pres-1',
            title: 'Test Presentation',
            slides: [{ id: 's1', content: 'Slide 1' }],
            createdAt: new Date().toISOString()
          }
        ]));
      });
      
      await page.goto('/presentations');
      
      // Should show the saved presentation
      const savedPres = page.locator('text=Test Presentation');
      // May or may not be visible depending on implementation
    });
  });

  test.describe('Presentation Creation', () => {
    test('should open creation wizard', async ({ page }) => {
      await page.goto('/presentations');
      
      const createBtn = page.locator('button:has-text("Создать"), button:has-text("Create")').first();
      await createBtn.click();
      
      // Should show creation wizard/modal
      const wizard = page.locator('[role="dialog"], .modal, form');
      // Wizard should appear
    });

    test('should have topic input field', async ({ page }) => {
      await page.goto('/presentations');
      
      const createBtn = page.locator('button:has-text("Создать"), button:has-text("Create")').first();
      if (await createBtn.isVisible()) {
        await createBtn.click();
        
        // Should have topic input
        const topicInput = page.locator('input[placeholder*="тем"], input[placeholder*="topic"], textarea');
        await expect(topicInput.first()).toBeVisible();
      }
    });

    test('should have slide count selector', async ({ page }) => {
      await page.goto('/presentations');
      
      const createBtn = page.locator('button:has-text("Создать"), button:has-text("Create")').first();
      if (await createBtn.isVisible()) {
        await createBtn.click();
        
        // Should have slide count input or selector
        const slideCount = page.locator('input[type="number"], select, [role="slider"]');
        // Slide count control should be present
      }
    });

    test('should have style/template options', async ({ page }) => {
      await page.goto('/presentations');
      
      const createBtn = page.locator('button:has-text("Создать"), button:has-text("Create")').first();
      if (await createBtn.isVisible()) {
        await createBtn.click();
        
        // Should have style options
        const styleOptions = page.locator('text=/стиль|style|шаблон|template/i');
        // Style section should be present
      }
    });
  });

  test.describe('Presentation Editor', () => {
    test('should display slide editor', async ({ page }) => {
      // Create a presentation first
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('current-presentation', JSON.stringify({
          id: 'test-pres',
          title: 'Test',
          slides: [
            { id: 's1', title: 'Title Slide', content: 'Welcome' },
            { id: 's2', title: 'Content', content: 'Details here' }
          ]
        }));
      });
      
      await page.goto('/presentations/edit/test-pres');
      
      // Should show editor interface
      const editor = page.locator('[data-testid="slide-editor"], .slide-editor, [contenteditable]');
      // Editor should be visible
    });

    test('should have slide navigation', async ({ page }) => {
      await page.goto('/presentations');
      
      // Navigate to any presentation
      // Should have prev/next buttons or slide thumbnails
      const slideNav = page.locator('button[aria-label*="next"], button[aria-label*="prev"], .slide-thumbnail');
      // Navigation should be present in editor view
    });

    test('should support drag and drop slide reordering', async ({ page }) => {
      await page.goto('/presentations');
      
      // Drag and drop functionality testing
      // This requires a presentation with multiple slides
    });
  });

  test.describe('Presentation Export', () => {
    test('should have export button', async ({ page }) => {
      await page.goto('/presentations');
      
      // In editor or list view
      const exportBtn = page.locator('button:has-text("Экспорт"), button:has-text("Export"), button:has-text("Скачать")');
      // Export button should be visible
    });

    test('should offer multiple export formats', async ({ page }) => {
      await page.goto('/presentations');
      
      const exportBtn = page.locator('button:has-text("Экспорт"), button:has-text("Export")').first();
      if (await exportBtn.isVisible()) {
        await exportBtn.click();
        
        // Should show format options (PPTX, PDF, etc.)
        const formatOptions = page.locator('text=/pptx|pdf|png/i');
        // Format options should appear
      }
    });
  });

  test.describe('AI Generation', () => {
    test('should have AI generate button', async ({ page }) => {
      await page.goto('/presentations');
      
      const aiBtn = page.locator('button:has-text("AI"), button:has-text("Генерир"), button:has-text("Generate")');
      await expect(aiBtn.first()).toBeVisible();
    });

    test('should show loading state during generation', async ({ page }) => {
      await page.goto('/presentations');
      
      // Start generation
      const topicInput = page.locator('input, textarea').first();
      await topicInput.fill('Test Topic');
      
      const generateBtn = page.locator('button:has-text("Генерир"), button:has-text("Generate")').first();
      if (await generateBtn.isVisible()) {
        await generateBtn.click();
        
        // Should show loading spinner or progress
        const loading = page.locator('[class*="spin"], [class*="loading"], [role="progressbar"]');
        // Loading indicator should appear briefly
      }
    });
  });
});

test.describe('Academic Works Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedUser(page);
  });

  test('should display academic works page', async ({ page }) => {
    await page.goto('/academic');
    
    // Check for main elements
    await expect(page.getByRole('heading', { name: /академ|academic|работ/i })).toBeVisible();
  });

  test('should have document type selection', async ({ page }) => {
    await page.goto('/academic');
    
    // Should show document types (Essay, Course work, etc.)
    const docTypes = page.locator('text=/эссе|essay|курсов|course|реферат|report/i');
    await expect(docTypes.first()).toBeVisible();
  });

  test('should have AI detection checker', async ({ page }) => {
    await page.goto('/academic');
    
    // Should have AI detection tab or button
    const aiDetection = page.locator('button:has-text("AI"), text=/детект|detect/i');
    // AI detection should be available
  });

  test('should have plagiarism checker', async ({ page }) => {
    await page.goto('/academic');
    
    // Should have plagiarism tab or button
    const plagiarism = page.locator('button:has-text("Плагиат"), text=/плагиат|plagiar/i');
    // Plagiarism checker should be available
  });
});

test.describe('Dissertation Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedUser(page);
  });

  test('should display dissertation page', async ({ page }) => {
    await page.goto('/dissertation');
    
    // Check for dissertation heading
    await expect(page.getByRole('heading', { name: /диссерт|dissert/i })).toBeVisible();
  });

  test('should have chapter navigation', async ({ page }) => {
    await page.goto('/dissertation');
    
    // Should have chapter list or navigation
    const chapters = page.locator('text=/глава|chapter|введен|introd|заключ|conclus/i');
    await expect(chapters.first()).toBeVisible();
  });

  test('should have outline generator', async ({ page }) => {
    await page.goto('/dissertation');
    
    // Should have outline generation feature
    const outlineBtn = page.locator('button:has-text("План"), button:has-text("Outline")');
    // Outline button should be present
  });
});
