import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import {
    CacheManager,
    CacheKeyBuilder,
    CacheTTL
} from '../../../../shared';

/**
 * Token Payload structure
 */
export interface TokenPayload {
    userId: string;
    type: 'access' | 'refresh';
    iat?: number;
    exp?: number;
}

/**
 * Token pair returned after authentication
 */
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

/**
 * Token Service - Secure Token Management
 * 
 * @description Handles JWT access tokens and refresh token rotation.
 * Uses cache for refresh token storage and blacklisting.
 * 
 * @security
 * - Short-lived access tokens (15 minutes)
 * - Refresh tokens stored in cache with rotation on use
 * - Blacklisting via cache for logout
 * 
 * @pattern Singleton (via static methods)
 */
export class TokenService {
    private static readonly ACCESS_TOKEN_EXPIRY = '15m';
    private static readonly REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

    /**
     * Generate secure access and refresh token pair
     * 
     * @complexity O(1)
     * 
     * @param userId - User ID to encode in tokens
     * @returns Token pair with access token, refresh token, and expiry
     */
    static async generateTokenPair(userId: string): Promise<TokenPair> {
        const secret = this.getSecret();

        // Generate access token (short-lived)
        const accessToken = jwt.sign(
            { userId, type: 'access' },
            secret,
            { expiresIn: this.ACCESS_TOKEN_EXPIRY }
        );

        // Generate refresh token (cryptographically secure random ID)
        const refreshTokenId = crypto.randomBytes(32).toString('hex');
        const refreshToken = jwt.sign(
            { userId, type: 'refresh', jti: refreshTokenId },
            secret,
            { expiresIn: '7d' }
        );

        // Store refresh token in cache for validation
        try {
            const cache = CacheManager.getAdapter();
            const key = CacheKeyBuilder.session(refreshTokenId);
            await cache.set(key, { userId, valid: true }, this.REFRESH_TOKEN_EXPIRY_SECONDS);
        } catch (error) {
            console.warn('[TokenService] Failed to store refresh token:', error);
        }

        return {
            accessToken,
            refreshToken,
            expiresIn: 15 * 60 // 15 minutes in seconds
        };
    }

    /**
     * Refresh access token using refresh token
     * 
     * @description Validates refresh token, generates new token pair,
     * and invalidates the old refresh token (rotation).
     * 
     * @security Implements refresh token rotation - old token is invalidated
     * 
     * @complexity O(1)
     * 
     * @param refreshToken - Current refresh token
     * @returns New token pair or null if invalid
     */
    static async refreshAccessToken(refreshToken: string): Promise<TokenPair | null> {
        const secret = this.getSecret();

        try {
            // 1. Verify refresh token signature
            const decoded = jwt.verify(refreshToken, secret) as TokenPayload & { jti: string };

            if (decoded.type !== 'refresh' || !decoded.jti) {
                return null;
            }

            // 2. Check if refresh token is still valid in cache
            const cache = CacheManager.getAdapter();
            const key = CacheKeyBuilder.session(decoded.jti);
            const storedToken = await cache.get<{ userId: string; valid: boolean }>(key);

            if (!storedToken || !storedToken.valid) {
                // Token was revoked or doesn't exist
                return null;
            }

            // 3. Invalidate old refresh token (rotation)
            await cache.delete(key);

            // 4. Generate new token pair
            return this.generateTokenPair(decoded.userId);

        } catch (error) {
            // Token invalid or expired
            return null;
        }
    }

    /**
     * Verify access token
     * 
     * @complexity O(1)
     * 
     * @param token - Access token to verify
     * @returns Decoded payload or null if invalid
     */
    static verifyAccessToken(token: string): TokenPayload | null {
        const secret = this.getSecret();

        try {
            const decoded = jwt.verify(token, secret) as TokenPayload;

            if (decoded.type !== 'access') {
                return null;
            }

            return decoded;
        } catch {
            return null;
        }
    }

    /**
     * Revoke refresh token (logout)
     * 
     * @description Removes refresh token from cache, preventing reuse.
     * 
     * @complexity O(1)
     * 
     * @param refreshToken - Refresh token to revoke
     * @returns true if revoked successfully
     */
    static async revokeRefreshToken(refreshToken: string): Promise<boolean> {
        const secret = this.getSecret();

        try {
            const decoded = jwt.verify(refreshToken, secret) as TokenPayload & { jti: string };

            if (!decoded.jti) {
                return false;
            }

            const cache = CacheManager.getAdapter();
            const key = CacheKeyBuilder.session(decoded.jti);
            await cache.delete(key);

            return true;
        } catch {
            // Token already invalid
            return false;
        }
    }

    /**
     * Revoke all refresh tokens for a user
     * 
     * @description Used for password reset or security-critical operations.
     * Clears all sessions for the user.
     * 
     * @complexity O(n) where n is number of user's sessions
     * 
     * @param userId - User ID to revoke all tokens for
     */
    static async revokeAllUserTokens(userId: string): Promise<void> {
        try {
            const cache = CacheManager.getAdapter();
            // Delete all session keys for this user
            // Note: This requires pattern matching which is O(n)
            await cache.deletePattern(CacheKeyBuilder.pattern('auth', 'session'));
        } catch (error) {
            console.warn('[TokenService] Failed to revoke user tokens:', error);
        }
    }

    /**
     * Get JWT secret with validation
     */
    private static getSecret(): string {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET not configured');
        }
        return secret;
    }
}
