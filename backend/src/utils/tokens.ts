/**
 * JWT Token utilities
 * Handles access token (15min) + refresh token (7 days) issuance and validation
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../index';
import { logger } from './logger';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate a short-lived access token
 */
export function generateAccessToken(userId: string): string {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET!,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Generate a cryptographically random refresh token and persist it
 */
export async function generateRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: { token, userId, expiresAt },
  });

  return token;
}

/**
 * Issue both access + refresh tokens
 */
export async function issueTokenPair(userId: string): Promise<TokenPair> {
  const accessToken = generateAccessToken(userId);
  const refreshToken = await generateRefreshToken(userId);
  return { accessToken, refreshToken };
}

/**
 * Validate a refresh token:
 * - Must exist in DB
 * - Must not be expired
 * - Deletes the used token (one-time use / rotation)
 * Returns userId on success, null on failure.
 */
export async function rotateRefreshToken(oldToken: string): Promise<TokenPair | null> {
  try {
    const stored = await prisma.refreshToken.findUnique({ where: { token: oldToken } });

    if (!stored) {
      return null;
    }

    // Always delete the old token (one-time use)
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    if (stored.expiresAt < new Date()) {
      return null;
    }

    // Issue a fresh pair
    return issueTokenPair(stored.userId);
  } catch (error) {
    logger.error('Refresh token rotation error:', error);
    return null;
  }
}

/**
 * Revoke all refresh tokens for a user (e.g., on logout or password change)
 */
export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}

/**
 * Clean up expired refresh tokens (call periodically)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}
