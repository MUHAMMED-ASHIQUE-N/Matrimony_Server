import { Request, Response } from 'express';
import {
    asyncHandler,
    sendSuccess,
    sendError,
    HttpStatus
} from '../../../shared';
import { AuthService } from '../application/services/AuthService';
import { AuthRepositoryPostgres } from '../infrastructure/AuthRepository.postgres';

/**
 * Auth Controller
 * 
 * @description Handles HTTP requests for authentication.
 * Thin layer that delegates to AuthService.
 * 
 * @pattern Controller - HTTP request handling only
 */

// Instantiate service with repository (Dependency Injection)
const authRepository = new AuthRepositoryPostgres();
const authService = new AuthService(authRepository);

/**
 * POST /api/auth/signup
 * Register a new user or resend OTP for unverified user
 */
export const signup = asyncHandler(async (req: Request, res: Response) => {
    const { identifier, type, password } = req.body;

    // Validate type
    if (!['EMAIL', 'PHONE'].includes(type)) {
        return sendError(
            res,
            HttpStatus.BAD_REQUEST,
            'INVALID_TYPE',
            "Type must be 'EMAIL' or 'PHONE'"
        );
    }

    const result = await authService.register({ identifier, type, password });

    if (result.isFailure) {
        const error = result.error;
        return sendError(
            res,
            (error as { statusCode?: number }).statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
            (error as { code?: string }).code || 'REGISTRATION_FAILED',
            error.message
        );
    }

    const data = result.value;

    return sendSuccess(
        res,
        HttpStatus.OK,
        data.message,
        {
            userId: data.userId,
            isNew: data.isNew,
            devHint: process.env.NODE_ENV === 'development'
                ? 'Check server console for OTP'
                : undefined
        }
    );
});

/**
 * POST /api/auth/verify
 * Verify OTP and login user
 */
export const verify = asyncHandler(async (req: Request, res: Response) => {
    const { identifier, type, otp } = req.body;

    // Validate type
    if (!['EMAIL', 'PHONE'].includes(type)) {
        return sendError(
            res,
            HttpStatus.BAD_REQUEST,
            'INVALID_TYPE',
            "Type must be 'EMAIL' or 'PHONE'"
        );
    }

    const result = await authService.verifyOtp({ identifier, type, otp });

    if (result.isFailure) {
        const error = result.error;
        return sendError(
            res,
            (error as { statusCode?: number }).statusCode || HttpStatus.BAD_REQUEST,
            (error as { code?: string }).code || 'VERIFICATION_FAILED',
            error.message
        );
    }

    const data = result.value;

    return sendSuccess(
        res,
        HttpStatus.OK,
        'Verified successfully. Logged in.',
        {
            token: data.token,
            userId: data.userId,
            user: data.user
        }
    );
});

/**
 * POST /api/auth/login
 * Login with email/phone and password
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
    const { identifier, type, password } = req.body;

    // Validate type
    if (!['EMAIL', 'PHONE'].includes(type)) {
        return sendError(
            res,
            HttpStatus.BAD_REQUEST,
            'INVALID_TYPE',
            "Type must be 'EMAIL' or 'PHONE'"
        );
    }

    const result = await authService.login({ identifier, type, password });

    if (result.isFailure) {
        const error = result.error as any;

        // Special handling for unverified accounts - include userId for resend OTP
        if (error.code === 'ACCOUNT_NOT_VERIFIED') {
            return sendError(
                res,
                HttpStatus.FORBIDDEN,
                'ACCOUNT_NOT_VERIFIED',
                error.message,
                {
                    userId: error.userId,
                    canResendOtp: true,
                    hint: 'Call POST /api/auth/resend-otp to resend verification code'
                }
            );
        }

        return sendError(
            res,
            (error as { statusCode?: number }).statusCode || HttpStatus.UNAUTHORIZED,
            (error as { code?: string }).code || 'LOGIN_FAILED',
            error.message
        );
    }

    const data = result.value;

    return sendSuccess(
        res,
        HttpStatus.OK,
        'Login successful',
        {
            token: data.token,
            userId: data.userId,
            user: data.user
        }
    );
});

/**
 * POST /api/auth/resend-otp
 * Resend OTP to unverified user
 */
export const resendOtp = asyncHandler(async (req: Request, res: Response) => {
    const { identifier, type } = req.body;

    // Validate type
    if (!['EMAIL', 'PHONE'].includes(type)) {
        return sendError(
            res,
            HttpStatus.BAD_REQUEST,
            'INVALID_TYPE',
            "Type must be 'EMAIL' or 'PHONE'"
        );
    }

    const result = await authService.resendOtp({ identifier, type });

    if (result.isFailure) {
        const error = result.error;
        return sendError(
            res,
            (error as { statusCode?: number }).statusCode || HttpStatus.BAD_REQUEST,
            (error as { code?: string }).code || 'RESEND_OTP_FAILED',
            error.message
        );
    }

    const data = result.value;

    return sendSuccess(
        res,
        HttpStatus.OK,
        data.message,
        {
            userId: data.userId,
            devHint: process.env.NODE_ENV === 'development'
                ? 'Check server console for OTP'
                : undefined
        }
    );
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 * 
 * @security Implements refresh token rotation - old token is invalidated
 */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return sendError(
            res,
            HttpStatus.BAD_REQUEST,
            'MISSING_REFRESH_TOKEN',
            'Refresh token is required'
        );
    }

    // Import TokenService for token operations
    const { TokenService } = await import('../application/services/TokenService');
    const tokens = await TokenService.refreshAccessToken(refreshToken);

    if (!tokens) {
        return sendError(
            res,
            HttpStatus.UNAUTHORIZED,
            'INVALID_REFRESH_TOKEN',
            'Refresh token is invalid or expired'
        );
    }

    return sendSuccess(
        res,
        HttpStatus.OK,
        'Token refreshed successfully',
        {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn
        }
    );
});

/**
 * POST /api/auth/logout
 * Revoke refresh token (logout)
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return sendError(
            res,
            HttpStatus.BAD_REQUEST,
            'MISSING_REFRESH_TOKEN',
            'Refresh token is required for logout'
        );
    }

    // Import TokenService for token operations
    const { TokenService } = await import('../application/services/TokenService');
    await TokenService.revokeRefreshToken(refreshToken);

    return sendSuccess(
        res,
        HttpStatus.OK,
        'Logged out successfully',
        { success: true }
    );
});
