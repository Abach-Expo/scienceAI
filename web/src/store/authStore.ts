/**
 * Centralized Auth Store (Zustand)
 * Single source of truth for authentication state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
        // Zustand persist handles storage — no manual localStorage needed
      },

      logout: () => {
        set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
        // Clean up any legacy keys
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('profile_completed');
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
    }
  )
);
