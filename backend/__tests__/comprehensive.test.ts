import request from 'supertest';
import jwt from 'jsonwebtoken';

// Mock Prisma before importing app
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    chat: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    chatMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    document: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    usageLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    userSettings: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    outline: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    aIAnalysis: {
      create: jest.fn(),
    },
    savedDissertation: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    savedPresentation: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Mock AI services
jest.mock('../src/services/ai.service', () => ({
  AIService: jest.fn().mockImplementation(() => ({
    generate: jest.fn().mockResolvedValue({
      content: 'Test response',
      model: 'test-model',
      provider: 'test-provider',
    }),
    generateOutline: jest.fn().mockResolvedValue([]),
    generateArguments: jest.fn().mockResolvedValue({ arguments: [] }),
    generateDraft: jest.fn().mockResolvedValue({ content: 'Draft content' }),
    analyzeDocument: jest.fn().mockResolvedValue({ overallScore: 85 }),
    improveStyle: jest.fn().mockResolvedValue({ content: 'Improved', changes: [] }),
    selfReview: jest.fn().mockResolvedValue({ feedback: 'Good' }),
  })),
}));

jest.mock('../src/services/plagiarism.service', () => ({
  checkPlagiarism: jest.fn().mockResolvedValue({
    uniquenessScore: 95,
    aiProbability: 10,
    sourcesFound: 0,
    sources: [],
  }),
}));

jest.mock('../src/services/dissertation.service', () => ({
  DissertationService: jest.fn().mockImplementation(() => ({
    generateFullDissertation: jest.fn().mockResolvedValue({ content: 'Generated dissertation' }),
    estimateGenerationTime: jest.fn().mockReturnValue({
      estimatedMinutes: 15,
      estimatedTokens: 50000,
    }),
  })),
}));

// Set required env vars
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-secret-key-for-tests-minimum-32-characters-long-enough';
process.env.OPENAI_API_KEY = 'sk-test-key';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
process.env.NODE_ENV = 'test';

const JWT_SECRET = process.env.JWT_SECRET;

function createTestToken(userId: string = 'test-user-id') {
  return jwt.sign({ userId }, JWT_SECRET!, { expiresIn: '1h' });
}

let app: any;

beforeAll(async () => {
  const module = await import('../src/index');
  app = module.default;
});

// ==================== MIDDLEWARE TESTS ====================

describe('Auth Middleware', () => {
  it('should reject requests without Authorization header', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject requests with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);
  });

  it('should reject requests with expired token', async () => {
    const expired = jwt.sign({ userId: 'test' }, JWT_SECRET!, { expiresIn: '0s' });
    // Wait for token to expire
    await new Promise((r) => setTimeout(r, 100));
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });
});

// ==================== ROUTE SECURITY TESTS ====================

describe('Route Security', () => {
  it('AI routes require authentication', async () => {
    const res = await request(app)
      .post('/api/ai/generate')
      .send({ systemPrompt: 'test', userPrompt: 'test' });
    expect(res.status).toBe(401);
  });

  it('Dissertation routes require authentication', async () => {
    const res = await request(app)
      .post('/api/dissertation/generate')
      .send({ topic: 'test', type: 'essay', targetPages: 5 });
    expect(res.status).toBe(401);
  });

  it('Dissertation estimate requires authentication', async () => {
    const res = await request(app)
      .post('/api/dissertation/estimate')
      .send({ targetPages: 10, type: 'essay' });
    expect(res.status).toBe(401);
  });

  it('Storage routes require authentication', async () => {
    const res = await request(app).get('/api/storage/dissertations');
    expect(res.status).toBe(401);
  });

  it('Chat routes require authentication', async () => {
    const res = await request(app).get('/api/chats');
    expect(res.status).toBe(401);
  });
});

// ==================== VALIDATION TESTS ====================

describe('Input Validation', () => {
  const token = createTestToken();

  describe('AI /generate validation', () => {
    it('should reject empty systemPrompt', async () => {
      const res = await request(app)
        .post('/api/ai/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ systemPrompt: '', userPrompt: 'test' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject empty userPrompt', async () => {
      const res = await request(app)
        .post('/api/ai/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ systemPrompt: 'test', userPrompt: '' });
      expect(res.status).toBe(400);
    });

    it('should reject invalid temperature', async () => {
      const res = await request(app)
        .post('/api/ai/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ systemPrompt: 'test', userPrompt: 'test', temperature: 5 });
      expect(res.status).toBe(400);
    });

    it('should reject invalid model', async () => {
      const res = await request(app)
        .post('/api/ai/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ systemPrompt: 'test', userPrompt: 'test', model: 'invalid-model' });
      expect(res.status).toBe(400);
    });
  });

  describe('Dissertation validation', () => {
    it('should reject missing topic', async () => {
      const res = await request(app)
        .post('/api/dissertation/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'essay', targetPages: 5 });
      expect(res.status).toBe(400);
    });

    it('should reject invalid type', async () => {
      const res = await request(app)
        .post('/api/dissertation/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ topic: 'Test', type: 'invalid', targetPages: 5 });
      expect(res.status).toBe(400);
    });

    it('should reject pages out of range', async () => {
      const res = await request(app)
        .post('/api/dissertation/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ topic: 'Test', type: 'essay', targetPages: 500 });
      expect(res.status).toBe(400);
    });
  });

  describe('Auth validation', () => {
    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password: 'longpassword', name: 'Test' });
      expect(res.status).toBe(400);
    });

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'valid@test.com', password: '12', name: 'Test' });
      expect(res.status).toBe(400);
    });

    it('should reject login with empty body', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});
      expect(res.status).toBe(400);
    });
  });
});

// ==================== ERROR HANDLING TESTS ====================

describe('Error Handling', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Route not found');
  });

  it('should NOT leak error details in production-like errors', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.body).not.toHaveProperty('stack');
    expect(res.body).not.toHaveProperty('error');
  });

  it('health endpoint should work', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.version).toBe('1.0.0');
  });

  it('health endpoint should hide internals in production mode', async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const res = await request(app).get('/health');
    expect(res.body).not.toHaveProperty('uptime');
    expect(res.body).not.toHaveProperty('memory');
    process.env.NODE_ENV = origEnv;
  });
});

// ==================== RESPONSE FORMAT TESTS ====================

describe('Response Format Consistency', () => {
  it('validation errors return { success: false }', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});
    expect(res.body.success).toBe(false);
  });

  it('404 returns { success: false, message }', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.body).toEqual({
      success: false,
      message: 'Route not found',
    });
  });

  it('auth errors return { success: false }', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.body.success).toBe(false);
  });
});

// ==================== CORS & SECURITY HEADERS TESTS ====================

describe('Security Headers', () => {
  it('should include X-Request-Id header', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-request-id']).toBeDefined();
    // UUID format check
    expect(res.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('should include Helmet security headers', async () => {
    const res = await request(app).get('/health');
    // Helmet sets various security headers
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });
});
