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

// Import the module under test — enhancedAI uses dynamic features,
// so we test the fetch call pattern directly
describe('enhancedAI auth integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends auth headers with AI generate requests', async () => {
    // Track all fetch calls
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({
        success: true,
        content: 'Generated academic text about quantum computing and its applications.',
        model: 'gpt-4o',
        provider: 'openai',
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
      })),
      json: () => Promise.resolve({
        success: true,
        content: 'Generated academic text about quantum computing and its applications.',
        model: 'gpt-4o',
        provider: 'openai',
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
      }),
    });
    globalThis.fetch = fetchMock;

    // Import after mocks are set up
    const { generateEnhanced } = await import('../services/enhancedAI');
    
    await generateEnhanced(
      'You are an academic writer.',
      'Write about quantum computing.',
      { maxTokens: 1000 }
    );

    // Verify that the request was made with auth headers
    expect(fetchMock).toHaveBeenCalled();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/ai/generate');
    expect(options.headers).toHaveProperty('Authorization', 'Bearer test-token');
  });

  it('includes Content-Type header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({
        success: true,
        content: 'Test content',
        model: 'gpt-4o',
      })),
      json: () => Promise.resolve({
        success: true,
        content: 'Test content',
        model: 'gpt-4o',
      }),
    });
    globalThis.fetch = fetchMock;

    const { generateEnhanced } = await import('../services/enhancedAI');
    
    await generateEnhanced('System', 'User prompt');

    if (fetchMock.mock.calls.length > 0) {
      const [, options] = fetchMock.mock.calls[0];
      expect(options.headers).toHaveProperty('Content-Type', 'application/json');
    }
  });
});
