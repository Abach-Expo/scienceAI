/**
 * 🧪 Playwright Test Fixtures
 * Custom fixtures and helpers for E2E testing
 */

import { test as base, expect } from '@playwright/test';

// Types for authenticated user
interface UserAuth {
  id: string;
  email: string;
  name: string;
  token: string;
}

interface SubscriptionState {
  plan: 'free' | 'starter' | 'pro' | 'premium';
  tokensUsed: number;
  tokensLimit: number;
  aiGenerationsUsed: number;
  isActive: boolean;
}

// Extended test fixtures
export const test = base.extend<{
  authenticatedPage: ReturnType<typeof base.extend>;
}>({
  authenticatedPage: async ({ page }, use) => {
    // Set up authenticated state
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
    
    await use(page);
  },
});

// Helper functions
export async function setupAuthenticatedUser(
  page: any, 
  plan: SubscriptionState['plan'] = 'pro'
): Promise<void> {
  await page.goto('/');
  await page.evaluate((userPlan: string) => {
    localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        user: { id: 'test-user', email: 'test@test.com', name: 'Test User' },
        token: 'fake-jwt-token',
        isAuthenticated: true
      },
      version: 0
    }));
    
    const limits: Record<string, { tokens: number; gens: number }> = {
      free: { tokens: 100, gens: 5 },
      starter: { tokens: 50000, gens: 50 },
      pro: { tokens: 150000, gens: 150 },
      premium: { tokens: 500000, gens: 500 },
    };
    
    localStorage.setItem('subscription-storage', JSON.stringify({
      state: {
        plan: userPlan,
        tokensUsed: 0,
        tokensLimit: limits[userPlan]?.tokens || 100,
        aiGenerationsUsed: 0,
        isActive: true
      },
      version: 0
    }));
  }, plan);
  await page.reload();
}

export async function clearLocalStorage(page: any): Promise<void> {
  await page.evaluate(() => localStorage.clear());
}

export async function setExhaustedLimits(page: any): Promise<void> {
  await page.evaluate(() => {
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
}

// Re-export expect for convenience
export { expect };
