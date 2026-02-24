/**
 * ✅ Happy-path tests — successful flows for auth, profile, and core API routes.
 * These complement the existing negative/security tests in api.test.ts and comprehensive.test.ts.
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// ============ Prisma mock ============

const mockUser = {
  id: 'user-1',
  email: 'alice@example.com',
  name: 'Alice',
  password: bcrypt.hashSync('StrongPass1', 10),
  provider: 'local',
  role: 'user',
  isEmailVerified: true,
  subscriptionPlan: 'free',
  subscriptionStatus: 'active',
  subscriptionExpiry: null,
  aiGenerationsUsed: 0,
  aiGenerationsLimit: 10,
  tokensUsed: 0,
  tokensLimit: 5000,
  gpt4oTokensUsed: 0,
  gpt4oTokensLimit: 0,
  currentPeriodStart: new Date(),
  currentPeriodEnd: null,
  presentationsCreated: 0,
  academicWorksCreated: 0,
  academicGenerationsToday: 0,
  chatMessagesToday: 0,
  dalleImagesUsed: 0,
  plagiarismChecksUsed: 0,
  dissertationGenerationsUsed: 0,
  largeChapterGenerationsUsed: 0,
  usageLastResetDate: new Date(),
  usageLastMonthlyReset: new Date(),
  apiCallsCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

jest.mock('@prisma/client', () => {
  const client = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    chat: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      delete: jest.fn(),
    },
    chatMessage: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    document: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
    },
    usageLog: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    userSettings: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
    },
    outline: { findUnique: jest.fn(), create: jest.fn() },
    aIAnalysis: { create: jest.fn() },
    savedDissertation: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    savedPresentation: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    refreshToken: {
      create: jest.fn().mockResolvedValue({ id: 'rt-1', token: 'hashed', userId: 'user-1' }),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  return { PrismaClient: jest.fn(() => client) };
});

// Mock AI services so they never hit real APIs
jest.mock('../src/services/ai.service', () => ({
  AIService: jest.fn().mockImplementation(() => ({
    generate: jest.fn().mockResolvedValue({ content: 'Hello', model: 'gpt-4o-mini', provider: 'openai' }),
  })),
}));
jest.mock('../src/services/plagiarism.service', () => ({
  checkPlagiarism: jest.fn().mockResolvedValue({ uniquenessScore: 95, aiProbability: 10, sourcesFound: 0, sources: [] }),
}));
jest.mock('../src/services/dissertation.service', () => ({
  DissertationService: jest.fn().mockImplementation(() => ({})),
}));

// Env
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'happy-path-jwt-secret-that-is-long-enough-32-chars';
process.env.OPENAI_API_KEY = 'sk-test';
process.env.NODE_ENV = 'test';

const JWT_SECRET = process.env.JWT_SECRET;

function authToken(userId = 'user-1') {
  return jwt.sign({ userId }, JWT_SECRET!, { expiresIn: '15m' });
}

let app: any;
let prisma: any;

beforeAll(async () => {
  const mod = await import('../src/index');
  app = mod.default;
  prisma = mod.prisma;
});

afterEach(() => jest.clearAllMocks());

// ==================== REGISTRATION ====================

describe('Registration (happy path)', () => {
  it('POST /api/auth/register — creates a new user and returns tokens', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null); // email not taken
    prisma.user.create.mockResolvedValueOnce({ ...mockUser, id: 'new-user' });
    prisma.refreshToken.create.mockResolvedValueOnce({ id: 'rt-1' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'bob@example.com', password: 'StrongPass1', name: 'Bob' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.email).toBe('alice@example.com'); // from mock
  });
});

// ==================== LOGIN ====================

describe('Login (happy path)', () => {
  it('POST /api/auth/login — authenticates and returns tokens', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(mockUser);
    prisma.refreshToken.create.mockResolvedValueOnce({ id: 'rt-2' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'StrongPass1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.email).toBe('alice@example.com');
  });
});

// ==================== GET /me ====================

describe('GET /api/auth/me (happy path)', () => {
  it('returns current user profile', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(mockUser);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('alice@example.com');
    // Should NOT leak password
    expect(res.body.user.password).toBeUndefined();
  });
});

// ==================== PUT /password ====================

describe('PUT /api/auth/password (happy path)', () => {
  it('changes password when current is correct', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(mockUser);
    prisma.user.update.mockResolvedValueOnce({ ...mockUser, password: 'new-hash' });

    const res = await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ currentPassword: 'StrongPass1', newPassword: 'NewStrong9' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('rejects weak new password (no uppercase)', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(mockUser);

    const res = await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ currentPassword: 'StrongPass1', newPassword: 'weakpass1' });

    expect(res.status).toBe(400);
  });
});

// ==================== LOG-USAGE ====================

describe('POST /api/auth/log-usage (happy path)', () => {
  it('logs a valid usage action', async () => {
    prisma.usageLog.create.mockResolvedValueOnce({ id: 'log-1' });
    prisma.user.findUnique.mockResolvedValueOnce(mockUser);

    const res = await request(app)
      .post('/api/auth/log-usage')
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ action: 'chat_message', tokensUsed: 150 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('rejects disallowed action', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(mockUser);

    const res = await request(app)
      .post('/api/auth/log-usage')
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ action: 'hacked_action', tokensUsed: 1 });

    expect(res.status).toBe(400);
  });
});

// ==================== HEALTH ====================

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
