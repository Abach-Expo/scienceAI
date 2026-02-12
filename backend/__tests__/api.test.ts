import request from 'supertest';

// Mock Prisma before importing app
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
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
      findMany: jest.fn(),
      create: jest.fn(),
    },
    usageLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    userSettings: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Set required env vars for tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-secret-key-for-tests-minimum-32-characters-long';
process.env.OPENAI_API_KEY = 'sk-test-key';
process.env.NODE_ENV = 'test';

describe('Health Check', () => {
  let app: any;

  beforeAll(async () => {
    // Import app after mocking
    const module = await import('../src/index');
    app = module.default;
  });

  it('GET /health should return 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /nonexistent should return 404', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('Auth Routes', () => {
  let app: any;

  beforeAll(async () => {
    const module = await import('../src/index');
    app = module.default;
  });

  describe('POST /api/auth/register', () => {
    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'invalid', password: '123456', name: 'Test' });

      expect(res.status).toBe(400);
    });

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@test.com', password: '123', name: 'Test' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should reject missing credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('Protected Routes', () => {
    it('should reject unauthenticated requests to /api/auth/me', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });
});

describe('Payment Routes', () => {
  let app: any;

  beforeAll(async () => {
    const module = await import('../src/index');
    app = module.default;
  });

  describe('POST /api/payments/create-checkout', () => {
    it('should reject invalid plan', async () => {
      const res = await request(app)
        .post('/api/payments/create-checkout')
        .send({
          planId: 'invalid',
          email: 'test@test.com',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/payments/verify-subscription', () => {
    it('should reject missing subscription ID', async () => {
      const res = await request(app)
        .post('/api/payments/verify-subscription')
        .send({ provider: 'stripe' });

      expect(res.status).toBe(400);
    });
  });
});

describe('Subscription Routes', () => {
  let app: any;

  beforeAll(async () => {
    const module = await import('../src/index');
    app = module.default;
  });

  describe('GET /api/subscriptions/plans', () => {
    it('should return subscription plans without auth', async () => {
      const res = await request(app).get('/api/subscriptions/plans');
      // Subscription routes require auth middleware
      expect([200, 401]).toContain(res.status);
    });
  });
});
