"use strict";
/**
 * JWT Token utilities
 * Handles access token (15min) + refresh token (7 days) issuance and validation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.issueTokenPair = issueTokenPair;
exports.rotateRefreshToken = rotateRefreshToken;
exports.revokeAllRefreshTokens = revokeAllRefreshTokens;
exports.cleanupExpiredTokens = cleanupExpiredTokens;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const index_1 = require("../index");
const logger_1 = require("./logger");
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
/**
 * Generate a short-lived access token
 */
function generateAccessToken(userId) {
    return jsonwebtoken_1.default.sign({ userId }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}
/**
 * Generate a cryptographically random refresh token and persist it
 */
async function generateRefreshToken(userId) {
    const token = crypto_1.default.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    await index_1.prisma.refreshToken.create({
        data: { token, userId, expiresAt },
    });
    return token;
}
/**
 * Issue both access + refresh tokens
 */
async function issueTokenPair(userId) {
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
async function rotateRefreshToken(oldToken) {
    try {
        const stored = await index_1.prisma.refreshToken.findUnique({ where: { token: oldToken } });
        if (!stored) {
            return null;
        }
        // Always delete the old token (one-time use)
        await index_1.prisma.refreshToken.delete({ where: { id: stored.id } });
        if (stored.expiresAt < new Date()) {
            return null;
        }
        // Issue a fresh pair
        return issueTokenPair(stored.userId);
    }
    catch (error) {
        logger_1.logger.error('Refresh token rotation error:', error);
        return null;
    }
}
/**
 * Revoke all refresh tokens for a user (e.g., on logout or password change)
 */
async function revokeAllRefreshTokens(userId) {
    await index_1.prisma.refreshToken.deleteMany({ where: { userId } });
}
/**
 * Clean up expired refresh tokens (call periodically)
 */
async function cleanupExpiredTokens() {
    const result = await index_1.prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
}
//# sourceMappingURL=tokens.js.map