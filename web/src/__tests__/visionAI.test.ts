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

import { analyzeImageUrl, analyzeImageBase64 } from '../services/visionAI';

describe('visionAI', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('analyzeImageUrl', () => {
    it('sends request with auth headers', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          analysis: 'This is an image of a chart showing data trends.',
        }),
      });

      const result = await analyzeImageUrl('https://example.com/image.png');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/ai/analyze-image',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result.success).toBe(true);
      expect(result.analysis).toContain('chart');
    });

    it('throws on HTTP error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(analyzeImageUrl('https://example.com/img.png')).rejects.toThrow('HTTP error: 500');
    });

    it('throws on API error response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: false,
          error: 'Vision API unavailable',
        }),
      });

      await expect(analyzeImageUrl('https://example.com/img.png')).rejects.toThrow('Vision API unavailable');
    });
  });

  describe('analyzeImageBase64', () => {
    it('sends base64 data with auth headers', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          analysis: 'A scientific diagram.',
        }),
      });

      const result = await analyzeImageBase64('data:image/png;base64,iVBORw==');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/ai/analyze-image',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
          body: expect.stringContaining('imageBase64'),
        })
      );
      expect(result.success).toBe(true);
    });

    it('sends different prompt types', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          analysis: 'Analysis result',
        }),
      });

      await analyzeImageBase64('base64data', 'presentation');

      const callBody = JSON.parse((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      expect(callBody.prompt).toBeDefined();
    });
  });
});
