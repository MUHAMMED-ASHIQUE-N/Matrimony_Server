import { Router } from 'express';
import { signup, verify, login, refresh, logout, resendOtp } from './auth.controller';
import { validate } from '../../../middlewares/validate.middleware';
import {
    signupSchema,
    verifyOtpSchema,
    loginSchema,
    resendOtpSchema
} from '../../../validations/auth.validation';
import { RateLimiters } from '../../../shared';

/**
 * Auth Routes
 * 
 * @description Routes for authentication endpoints.
 * Uses rate limiting for security.
 * 
 * Base path: /api/auth
 */
const router = Router();

/**
 * @route   POST /api/auth/signup
 * @desc    Register new user or resend OTP
 * @access  Public
 * @ratelimit 10 req/min (strict for auth)
 */
router.post(
    '/signup',
    RateLimiters.auth,
    validate(signupSchema),
    signup
);

/**
 * @route   POST /api/auth/verify
 * @desc    Verify OTP and get auth token
 * @access  Public
 * @ratelimit 10 req/min (strict for auth)
 */
router.post(
    '/verify',
    RateLimiters.auth,
    validate(verifyOtpSchema),
    verify
);

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend OTP to unverified user
 * @access  Public
 * @ratelimit 10 req/min (strict for auth)
 */
router.post(
    '/resend-otp',
    RateLimiters.auth,
    validate(resendOtpSchema),
    resendOtp
);

/**
 * @route   POST /api/auth/login
 * @desc    Login with email/phone + password
 * @access  Public
 * @ratelimit 10 req/min (strict for auth)
 */
router.post(
    '/login',
    RateLimiters.auth,
    validate(loginSchema),
    login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 * @ratelimit 20 req/min (relaxed for token refresh)
 * @security Uses refresh token rotation - old token invalidated
 */
router.post(
    '/refresh',
    RateLimiters.auth,
    refresh
);

/**
 * @route   POST /api/auth/logout
 * @desc    Revoke refresh token (logout)
 * @access  Public
 * @ratelimit 20 req/min
 */
router.post(
    '/logout',
    RateLimiters.auth,
    logout
);

export default router;
