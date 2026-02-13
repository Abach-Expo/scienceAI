import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { OAuth2Client } from 'google-auth-library';
import { emailService } from '../services/email.service';

const router = Router();

// Google OAuth client
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '706158118774-ukrop2ocg4iq23fu5npamstfquu549q2.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Helper to log usage
const logUsage = async (userId: string, action: string, req: Request, tokensUsed: number = 0, details?: Record<string, unknown>) => {
  try {
    await prisma.usageLog.create({
      data: {
        userId,
        action,
        tokensUsed,
        details: details ? JSON.stringify(details) : null,
        ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      }
    });
    
    // Update user stats
    await prisma.user.update({
      where: { id: userId },
      data: {
        apiCallsCount: { increment: 1 },
        tokensUsed: { increment: tokensUsed },
        lastActiveAt: new Date(),
      }
    });
  } catch (error) {
    logger.error('Failed to log usage:', error);
  }
};

// Register new user
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().notEmpty()
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { email, password, name } = req.body;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        res.status(400).json({
          success: false,
          message: 'Пользователь с таким email уже существует'
        });
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          provider: 'local',
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          createdAt: true
        }
      });

      // Log registration
      await logUsage(user.id, 'register', req, 0, { method: 'email' });

      // Send welcome email (non-blocking)
      emailService.sendWelcomeEmail(user.email, user.name).catch(() => {});

      // Generate JWT
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET!,
        { expiresIn: '30d' }
      );

      res.status(201).json({
        success: true,
        data: { user, token }
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка регистрации'
      });
    }
  }
);

// Login user
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { email, password } = req.body;

      // Find user
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Неверный email или пароль'
        });
        return;
      }

      // Check if user registered via OAuth
      if (!user.password) {
        res.status(401).json({
          success: false,
          message: 'Этот аккаунт зарегистрирован через Google. Используйте вход через Google.'
        });
        return;
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          message: 'Неверный email или пароль'
        });
        return;
      }

      // Log login
      await logUsage(user.id, 'login', req, 0, { method: 'email' });

      // Generate JWT
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET!,
        { expiresIn: '30d' }
      );

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            provider: user.provider,
          },
          token
        }
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка входа'
      });
    }
  }
);

// Google OAuth login/register
router.post('/google', async (req: Request, res: Response): Promise<void> => {
  try {
    const { credential } = req.body;

    logger.debug('Google OAuth request received');
    logger.debug(`GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? 'Set' : 'NOT SET'}`);

    if (!credential) {
      res.status(400).json({
        success: false,
        message: 'Google credential не предоставлен'
      });
      return;
    }

    // Verify Google token
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
    } catch (verifyError: unknown) {
      const errMsg = verifyError instanceof Error ? verifyError.message : String(verifyError);
      logger.error('Google token verification failed:', errMsg);
      res.status(401).json({
        success: false,
        message: 'Ошибка верификации Google токена',
        debug: errMsg,
        clientIdSet: !!process.env.GOOGLE_CLIENT_ID,
        clientIdPrefix: process.env.GOOGLE_CLIENT_ID?.substring(0, 15) || 'NONE'
      });
      return;
    }

    const payload = ticket.getPayload();
    if (!payload) {
      res.status(401).json({
        success: false,
        message: 'Недействительный Google токен'
      });
      return;
    }

    const { email, name, picture, sub: googleId } = payload;

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email не получен от Google'
      });
      return;
    }

    // Find or create user
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId },
          { email }
        ]
      }
    });

    if (user) {
      // Update existing user with Google info if not set
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId,
            avatar: user.avatar || picture,
            provider: 'google',
          }
        });
      }
      
      // Log login
      await logUsage(user.id, 'login', req, 0, { method: 'google' });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          googleId,
          avatar: picture,
          provider: 'google',
        }
      });
      
      // Log registration
      await logUsage(user.id, 'register', req, 0, { method: 'google' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          provider: user.provider,
        },
        token
      }
    });
  } catch (error) {
    logger.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка авторизации через Google'
    });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        provider: true,
        apiCallsCount: true,
        tokensUsed: true,
        lastActiveAt: true,
        createdAt: true,
        _count: {
          select: {
            projects: true,
            documents: true,
            chats: true,
            usageLogs: true,
          }
        }
      }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
      return;
    }

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка получения данных пользователя'
    });
  }
});

// Get user usage stats
router.get('/usage', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    
    // Get user stats
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        apiCallsCount: true,
        tokensUsed: true,
      }
    });

    // Get usage logs for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentLogs = await prisma.usageLog.findMany({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo }
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Group by action
    const usageByAction = await prisma.usageLog.groupBy({
      by: ['action'],
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo }
      },
      _count: true,
      _sum: { tokensUsed: true },
    });

    res.json({
      success: true,
      data: {
        total: user,
        byAction: usageByAction,
        recentLogs,
      }
    });
  } catch (error) {
    logger.error('Usage stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения статистики'
    });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, avatar } = req.body;
    const userId = req.userId!;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(avatar && { avatar }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        provider: true,
      }
    });

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка обновления профиля'
    });
  }
});

// Change password (only for local users)
router.put('/password', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.userId!;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user || !user.password) {
      res.status(400).json({
        success: false,
        message: 'Смена пароля недоступна для аккаунтов Google'
      });
      return;
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      res.status(401).json({
        success: false,
        message: 'Неверный текущий пароль'
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({ success: true, message: 'Пароль успешно изменён' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка смены пароля'
    });
  }
});

// Log AI usage (called from frontend)
router.post('/log-usage', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { action, tokensUsed, details } = req.body;
    const userId = req.userId!;

    await logUsage(userId, action, req, tokensUsed || 0, details);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка логирования'
    });
  }
});

// Change password (authenticated user)
router.post(
  '/change-password',
  [
    body('currentPassword').isLength({ min: 1 }),
    body('newPassword').isLength({ min: 6 })
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      // Get user from token
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({ success: false, message: 'Не авторизован' });
        return;
      }
      
      const token = authHeader.replace('Bearer ', '');
      let decoded: { userId?: string; id?: string; email?: string; [key: string]: unknown };
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId?: string; id?: string; email?: string; [key: string]: unknown };
      } catch {
        res.status(401).json({ success: false, message: 'Неверный токен' });
        return;
      }

      const user = await prisma.user.findUnique({ where: { id: decoded.userId || decoded.id } });
      if (!user || user.provider !== 'local' || !user.password) {
        res.status(400).json({ success: false, message: 'Смена пароля недоступна для этого аккаунта' });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        res.status(400).json({ success: false, message: 'Неверный текущий пароль' });
        return;
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      });

      res.json({ success: true, message: 'Пароль успешно изменён' });
    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({ success: false, message: 'Ошибка при смене пароля' });
    }
  }
);

// Forgot password - request password reset
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { email } = req.body;

      // Find user
      const user = await prisma.user.findUnique({ where: { email } });
      
      // Always return success to prevent email enumeration
      if (!user || user.provider !== 'local') {
        res.json({
          success: true,
          message: 'Если аккаунт с таким email существует, мы отправили инструкции по восстановлению пароля'
        });
        return;
      }

      // Generate reset token (6 random digits for simplicity)
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Save reset token to user
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: await bcrypt.hash(resetCode, 10),
          resetTokenExpiry,
        }
      });

      // Send password reset email
      await emailService.sendPasswordResetCode(email, resetCode);

      res.json({
        success: true,
        message: 'Если аккаунт с таким email существует, мы отправили инструкции по восстановлению пароля'
      });
    } catch (error) {
      logger.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при запросе восстановления пароля'
      });
    }
  }
);

// Reset password with code
router.post(
  '/reset-password',
  [
    body('email').isEmail().normalizeEmail(),
    body('code').isLength({ min: 6, max: 6 }),
    body('newPassword').isLength({ min: 6 })
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { email, code, newPassword } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });

      if (!user || !user.resetToken || !user.resetTokenExpiry) {
        res.status(400).json({
          success: false,
          message: 'Неверный код или срок действия истёк'
        });
        return;
      }

      // Check if token is expired
      if (new Date() > user.resetTokenExpiry) {
        res.status(400).json({
          success: false,
          message: 'Срок действия кода истёк. Запросите новый код.'
        });
        return;
      }

      // Verify code
      const isCodeValid = await bcrypt.compare(code, user.resetToken);
      if (!isCodeValid) {
        res.status(400).json({
          success: false,
          message: 'Неверный код'
        });
        return;
      }

      // Update password and clear reset token
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        }
      });

      res.json({
        success: true,
        message: 'Пароль успешно изменён. Теперь вы можете войти с новым паролем.'
      });
    } catch (error) {
      logger.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при сбросе пароля'
      });
    }
  }
);

export default router;
