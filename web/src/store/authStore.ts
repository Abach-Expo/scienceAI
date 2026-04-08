/**
 * Centralized Auth Store (Zustand)
 * Single source of truth for authentication state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ================== HELPERS ==================

/** Decode JWT payload without external libs */
function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload;
  } catch {
    return null;
  }
}

/** Returns ms until token expires, or 0 if expired/invalid */
function getTokenTTL(token: string | null): number {
  if (!token) return 0;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return 0;
  return Math.max(0, payload.exp * 1000 - Date.now());
}

// Proactive refresh timer
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleTokenRefresh(token: string | null) {
  if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }
  const ttl = getTokenTTL(token);
  if (ttl <= 0) return;
  // Refresh 60s before expiry (min 5s)
  const delay = Math.max(5000, ttl - 60_000);
  refreshTimer = setTimeout(async () => {
    try {
      const { API_URL } = await import('../config');
      const refreshToken = useAuthStore.getState().getRefreshToken();
      if (!refreshToken) return;
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.data?.token && data.data?.refreshToken) {
        useAuthStore.getState().setTokens(data.data.token, data.data.refreshToken);
      }
    } catch { /* silent — reactive refresh on 401 is fallback */ }
  }, delay);
}

// ================== TYPES ==================

export interface UserData {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider?: string;
  apiCallsCount?: number;
  tokensUsed?: number;
  organization?: string;
  position?: string;
  isLoggedIn: boolean;
}

interface AuthState {
  // State
  token: string | null;
  refreshToken: string | null;
  user: UserData | null;
  isAuthenticated: boolean;

  // Actions
  login: (token: string, user: Omit<UserData, 'isLoggedIn'>, refreshToken?: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<UserData>) => void;
  setTokens: (token: string, refreshToken: string) => void;
  getToken: () => string | null;
  getRefreshToken: () => string | null;
  getUser: () => UserData | null;
  getUserEmail: () => string;
}

// ================== STORE ==================

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      login: (token: string, userData: Omit<UserData, 'isLoggedIn'>, refreshToken?: string) => {
        const user: UserData = { ...userData, isLoggedIn: true };
        set({ token, refreshToken: refreshToken || null, user, isAuthenticated: true });
        scheduleTokenRefresh(token);
      },

      logout: () => {
        if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }
        set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
        // Clean up any legacy keys
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('profile_completed');
        // Clear subscription/usage data so it doesn't leak to the next account
        localStorage.removeItem('subscription-storage');
      },

      updateUser: (updates: Partial<UserData>) => {
        const currentUser = get().user;
        if (currentUser) {
          const updated = { ...currentUser, ...updates };
          set({ user: updated });
        }
      },

      setTokens: (token: string, refreshToken: string) => {
        set({ token, refreshToken });
        scheduleTokenRefresh(token);
      },

      getToken: () => get().token,
      getRefreshToken: () => get().refreshToken,
      getUser: () => get().user,
      getUserEmail: () => get().user?.email || '',
    }),
    {
      name: 'auth-storage',
      version: 1,
      migrate: (persistedState: unknown, _version: number) => {
        // On first load, migrate from legacy localStorage
        if (!persistedState || !(persistedState as Record<string, unknown>).token) {
          const token = localStorage.getItem('token');
          const userStr = localStorage.getItem('user');
          if (token && userStr) {
            try {
              const user = JSON.parse(userStr) as UserData;
              return { token, user, isAuthenticated: !!user?.isLoggedIn };
            } catch {
              return { token: null, user: null, isAuthenticated: false };
            }
          }
        }
        return persistedState;
      },
      onRehydrateStorage: () => (state) => {
        // Schedule proactive token refresh on app load
        if (state?.token) {
          scheduleTokenRefresh(state.token);
        }
      },
    }
  )
);
