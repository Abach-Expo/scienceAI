import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../store/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      token: 'test-token-123',
      user: { id: '1', email: 'test@test.com', name: 'Test', isLoggedIn: true },
    }),
  },
}));

vi.mock('../config', () => ({
  API_URL: 'http://localhost:3001/api',
}));

import {
  createCheckout,
  getSubscriptionStatus,
  verifySubscription,
  cancelSubscription,
  resumeSubscription,
  changePlan,
} from '../services/payment';

describe('Payment Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('createCheckout', () => {
    it('returns checkout URL on success', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          checkoutUrl: 'https://checkout.lemonsqueezy.com/test',
          checkoutId: 'checkout-123',
        }),
      });

      const result = await createCheckout('pro', 'test@test.com');
      expect(result.success).toBe(true);
      expect(result.checkoutUrl).toContain('lemonsqueezy');
    });

    it('returns error on failure', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ success: false, error: 'Invalid plan' }),
      });

      const result = await createCheckout('pro', 'test@test.com');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid plan');
    });

    it('handles network errors', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await createCheckout('pro', 'test@test.com');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('sends correct request body', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, checkoutUrl: 'url' }),
      });

      await createCheckout('premium', 'user@example.com', 'annual');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/payments/create-checkout',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            planId: 'premium',
            billingPeriod: 'annual',
            email: 'user@example.com',
          }),
        })
      );
    });
  });

  describe('getSubscriptionStatus', () => {
    it('returns subscription on success', async () => {
      const mockSub = {
        plan: 'pro',
        status: 'active',
        expiresAt: '2025-12-31',
      };
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, subscription: mockSub }),
      });

      const result = await getSubscriptionStatus();
      expect(result).toEqual(mockSub);
    });

    it('returns null on error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: false });
      const result = await getSubscriptionStatus();
      expect(result).toBeNull();
    });

    it('returns null on network failure', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline'));
      const result = await getSubscriptionStatus();
      expect(result).toBeNull();
    });
  });

  describe('verifySubscription', () => {
    it('returns active status', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ active: true, status: 'active', planId: 'pro' }),
      });

      const result = await verifySubscription('sub-123');
      expect(result.active).toBe(true);
    });

    it('returns inactive on error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: false });
      const result = await verifySubscription('sub-invalid');
      expect(result.active).toBe(false);
    });
  });

  describe('cancelSubscription', () => {
    it('returns success', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const result = await cancelSubscription('sub-123');
      expect(result.success).toBe(true);
    });
  });

  describe('resumeSubscription', () => {
    it('returns success', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const result = await resumeSubscription('sub-123');
      expect(result.success).toBe(true);
    });
  });

  describe('changePlan', () => {
    it('sends correct plan change request', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const result = await changePlan('sub-123', 'premium', 'annual');
      expect(result.success).toBe(true);

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/payments/change-plan',
        expect.objectContaining({
          body: JSON.stringify({
            subscriptionId: 'sub-123',
            newPlanId: 'premium',
            newPeriod: 'annual',
          }),
        })
      );
    });
  });
});
