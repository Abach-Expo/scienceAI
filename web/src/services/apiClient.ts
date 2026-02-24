/**
 * Centralized HTTP API Client
 * Handles auth headers, token management, and API_URL automatically
 */

import { API_URL } from '../config';
import { useAuthStore } from '../store/authStore';
type RequestOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
  _isRetry?: boolean; // internal flag to prevent infinite retry loops
};

/**
 * Get auth headers from the auth store
 */
function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Returns true if refresh succeeded.
 */
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  // Deduplicate concurrent refresh calls
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = useAuthStore.getState().getRefreshToken();
      if (!refreshToken) return false;

      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      if (data.success && data.data?.token && data.data?.refreshToken) {
        useAuthStore.getState().setTokens(data.data.token, data.data.refreshToken);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Core fetch wrapper with auth + base URL
 */
async function request<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { headers = {}, ...rest } = options;
  
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...headers,
    },
  });

  if (!response.ok) {
    // Auto-refresh on 401 (token expired) — retry once
    if (response.status === 401 && !options._isRetry && useAuthStore.getState().isAuthenticated) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return request<T>(endpoint, { ...options, _isRetry: true });
      }
      // Refresh failed — log the user out
      useAuthStore.getState().logout();
    }

    const errorData = await response.json().catch(() => ({}));
    const error: Error & { status?: number; data?: unknown } = new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  return response.json();
}

/**
 * API client methods
 */
export const apiClient = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = any>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T = any>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};

/**
 * Get auth token (for cases where raw token is needed, e.g., streaming)
 */
export function getToken(): string | null {
  return useAuthStore.getState().token;
}

/**
 * Get auth headers (for cases like fetch streaming where apiClient isn't suitable)
 */
export function getAuthorizationHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };
}

export default apiClient;
