/**
 * JWT Token utilities
 * Handles access token (15min) + refresh token (7 days) issuance and validation
 */
interface TokenPair {
    accessToken: string;
    refreshToken: string;
}
/**
 * Generate a short-lived access token
 */
export declare function generateAccessToken(userId: string): string;
/**
 * Generate a cryptographically random refresh token and persist it
 */
export declare function generateRefreshToken(userId: string): Promise<string>;
/**
 * Issue both access + refresh tokens
 */
export declare function issueTokenPair(userId: string): Promise<TokenPair>;
/**
 * Validate a refresh token:
 * - Must exist in DB
 * - Must not be expired
 * - Deletes the used token (one-time use / rotation)
 * Returns userId on success, null on failure.
 */
export declare function rotateRefreshToken(oldToken: string): Promise<TokenPair | null>;
/**
 * Revoke all refresh tokens for a user (e.g., on logout or password change)
 */
export declare function revokeAllRefreshTokens(userId: string): Promise<void>;
/**
 * Clean up expired refresh tokens (call periodically)
 */
export declare function cleanupExpiredTokens(): Promise<number>;
export {};
//# sourceMappingURL=tokens.d.ts.map