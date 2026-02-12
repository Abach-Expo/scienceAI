import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../store/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      token: 'test-token',
      user: { id: '1', email: 'test@test.com', name: 'Test', isLoggedIn: true },
    }),
  },
}));

vi.mock('../config', () => ({
  API_URL: 'http://localhost:3001/api',
}));

// Need to mock apiClient before importing aiServer
vi.mock('./apiClient', () => ({
  getAuthorizationHeaders: () => ({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token',
  }),
}));

import { generateAI, checkAIServerStatus, createServerOpenAI } from '../services/aiServer';

describe('aiServer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateAI', () => {
    it('sends request with auth headers', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          success: true,
          content: 'Generated text',
          model: 'gpt-4o',
          provider: 'openai',
        })),
      });

      const result = await generateAI('System prompt', 'User prompt');
      expect(result.content).toBe('Generated text');
      expect(result.model).toBe('gpt-4o');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/ai/generate',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });

    it('returns error on empty response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(''),
      });

      const result = await generateAI('sys', 'user');
      expect(result.content).toBe('');
      expect(result.error).toContain('пустой ответ');
    });

    it('returns error on invalid JSON', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('not json'),
      });

      const result = await generateAI('sys', 'user');
      expect(result.error).toContain('JSON');
    });

    it('handles server error status', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve(JSON.stringify({
          success: false,
          error: 'Internal error',
        })),
      });

      const result = await generateAI('sys', 'user');
      expect(result.error).toBe('Internal error');
    });

    it('handles network errors', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('fetch failed'));

      const result = await generateAI('sys', 'user');
      expect(result.error).toBe('fetch failed');
    });

    it('sends taskType when provided', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ success: true, content: 'ok' })),
      });

      await generateAI('sys', 'user', { taskType: 'dissertation' });

      const body = JSON.parse((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      expect(body.taskType).toBe('dissertation');
    });
  });

  describe('checkAIServerStatus', () => {
    it('returns true when server is healthy', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });

      const status = await checkAIServerStatus();
      expect(status).toBe(true);
    });

    it('returns false on network error', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline'));

      const status = await checkAIServerStatus();
      expect(status).toBe(false);
    });
  });

  describe('createServerOpenAI', () => {
    it('returns OpenAI SDK-compatible object', () => {
      const openai = createServerOpenAI();
      expect(openai.chat).toBeDefined();
      expect(openai.chat.completions).toBeDefined();
      expect(openai.chat.completions.create).toBeInstanceOf(Function);
    });

    it('creates completion from messages', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          success: true,
          content: 'AI response',
        })),
      });

      const openai = createServerOpenAI('chat');
      const result = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are helpful' },
          { role: 'user', content: 'Hello' },
        ],
      });

      expect(result.choices[0].message.content).toBe('AI response');
      expect(result.choices[0].finish_reason).toBe('stop');
    });
  });
});
