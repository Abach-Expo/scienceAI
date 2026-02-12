import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock authStore before importing apiClient
vi.mock('../store/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      token: 'test-token-123',
      user: { id: '1', email: 'test@test.com', name: 'Test', isLoggedIn: true },
      isAuthenticated: true,
    }),
  },
}));

vi.mock('../config', () => ({
  API_URL: 'http://localhost:3001/api',
}));

import { apiClient, getToken, getAuthorizationHeaders } from '../services/apiClient';

describe('apiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getToken returns token from authStore', () => {
    expect(getToken()).toBe('test-token-123');
  });

  it('getAuthorizationHeaders includes Content-Type and Authorization', () => {
    const headers = getAuthorizationHeaders();
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Authorization']).toBe('Bearer test-token-123');
  });

  it('apiClient.get makes GET request with auth headers', async () => {
    const mockResponse = { success: true, data: [1, 2, 3] };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await apiClient.get('/test');
    expect(result).toEqual(mockResponse);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/test',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token-123',
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('apiClient.post sends JSON body', async () => {
    const body = { name: 'Test Project' };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    await apiClient.post('/projects', body);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/projects',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(body),
      })
    );
  });

  it('apiClient throws on HTTP error with message', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ message: 'Forbidden' }),
    });

    await expect(apiClient.get('/secret')).rejects.toThrow('Forbidden');
  });

  it('apiClient.delete sends DELETE request', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    await apiClient.delete('/items/123');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/items/123',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('apiClient handles absolute URLs', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await apiClient.get('https://external.api.com/data');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://external.api.com/data',
      expect.anything()
    );
  });
});
