import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../store/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      token: 'test-token',
      user: { id: '1', email: 'test@test.com', name: 'Test' },
    }),
  },
}));

vi.mock('../config', () => ({
  API_URL: 'http://localhost:3001/api',
}));

vi.mock('../services/apiClient', () => ({
  getAuthorizationHeaders: () => ({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token',
  }),
}));

import { listPresentations, getPresentation, savePresentation, deletePresentation } from '../services/presentationStorage';

describe('presentationStorage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('listPresentations', () => {
    it('sends request with auth headers', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          presentations: [
            { id: '1', title: 'Test', topic: 'AI', theme: 'modern', slideCount: 5, hasImages: false, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          ],
        }),
      });

      const result = await listPresentations();

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/presentations',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test');
    });

    it('throws on failure', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false, message: 'Unauthorized' }),
      });

      await expect(listPresentations()).rejects.toThrow('Unauthorized');
    });
  });

  describe('getPresentation', () => {
    it('fetches by id with auth', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          presentation: { id: 'abc', title: 'My Pres', slides: [] },
        }),
      });

      const result = await getPresentation('abc');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/presentations/abc',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
      expect(result.id).toBe('abc');
    });
  });

  describe('savePresentation', () => {
    it('sends POST with auth and body', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          presentation: { id: 'new-id', title: 'New Pres' },
        }),
      });

      const result = await savePresentation({
        title: 'New Pres',
        slides: [{ type: 'title', content: 'Hello' }],
      });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/presentations',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
          body: expect.stringContaining('New Pres'),
        })
      );
      expect(result.id).toBe('new-id');
    });
  });

  describe('deletePresentation', () => {
    it('sends DELETE with auth', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await deletePresentation('abc');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/presentations/abc',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });

    it('throws on failure', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false, message: 'Not found' }),
      });

      await expect(deletePresentation('xyz')).rejects.toThrow('Not found');
    });
  });
});
