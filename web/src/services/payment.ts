// ================== PAYMENT SERVICE - LemonSqueezy Only ==================

import { PlanType } from '../store/subscriptionStore';
import { API_URL } from '../config';
import { getAuthorizationHeaders } from './apiClient';

// ================== TYPES ==================

export type BillingPeriod = 'monthly' | 'annual';

export interface CheckoutResult {
  success: boolean;
  checkoutUrl?: string;
  checkoutId?: string;
  error?: string;
}

export interface SubscriptionStatus {
  plan: PlanType;
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  expiresAt: string | null;
  subscriptionId: string | null;
  customerId: string | null;
  usage: {
    tokensUsed: number;
    tokensLimit: number;
    aiGenerationsUsed: number;
    aiGenerationsLimit: number;
  };
  periodStart: string | null;
  periodEnd: string | null;
}

// ================== HELPERS ==================

const getAuthHeaders = (): Record<string, string> => getAuthorizationHeaders();

// ================== CREATE CHECKOUT ==================

export const createCheckout = async (
  planId: PlanType,
  email: string,
  billingPeriod: BillingPeriod = 'monthly',
): Promise<CheckoutResult> => {
  try {
    const response = await fetch(`${API_URL}/payments/create-checkout`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ planId, billingPeriod, email }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to create checkout' };
    }

    return {
      success: true,
      checkoutUrl: data.checkoutUrl,
      checkoutId: data.checkoutId,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Network error';
    return { success: false, error: message };
  }
};

/**
 * Create checkout and redirect to LemonSqueezy payment page
 */
export const redirectToCheckout = async (
  planId: PlanType,
  email: string,
  billingPeriod: BillingPeriod = 'monthly',
): Promise<void> => {
  const result = await createCheckout(planId, email, billingPeriod);

  if (!result.success || !result.checkoutUrl) {
    throw new Error(result.error || 'Failed to create checkout session');
  }

  window.location.href = result.checkoutUrl;
};

// ================== SUBSCRIPTION STATUS ==================

export const getSubscriptionStatus = async (): Promise<SubscriptionStatus | null> => {
  try {
    const response = await fetch(`${API_URL}/payments/status`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.success ? data.subscription : null;
  } catch {
    return null;
  }
};

// ================== VERIFY SUBSCRIPTION ==================

export const verifySubscription = async (
  subscriptionId: string,
): Promise<{ active: boolean; status?: string; planId?: string }> => {
  try {
    const response = await fetch(`${API_URL}/payments/verify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ subscriptionId }),
    });

    if (!response.ok) return { active: false };
    return response.json();
  } catch {
    return { active: false };
  }
};

// ================== CANCEL SUBSCRIPTION ==================

export const cancelSubscription = async (
  subscriptionId: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${API_URL}/payments/cancel`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ subscriptionId }),
    });

    return response.json();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
};

// ================== RESUME SUBSCRIPTION ==================

export const resumeSubscription = async (
  subscriptionId: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${API_URL}/payments/resume`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ subscriptionId }),
    });

    return response.json();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
};

// ================== CHANGE PLAN ==================

export const changePlan = async (
  subscriptionId: string,
  newPlanId: PlanType,
  newPeriod: BillingPeriod = 'monthly',
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${API_URL}/payments/change-plan`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ subscriptionId, newPlanId, newPeriod }),
    });

    return response.json();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
};
