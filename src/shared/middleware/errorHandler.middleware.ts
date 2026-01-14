import { Request, Response, NextFunction } from 'express';
import { AppError, RateLimitError } from '../errors/AppError';
import { sendError } from '../utils/ResponseFormatter';

/**
 * Centralized Error Handler Middleware
 * 
 * @description Catches all errors and formats them consistently.
 * Distinguishes between operational errors (expected) and programmer errors (bugs).
 * 
 * @why Single place for error handling logic:
 * - Consistent API error responses
 * - Centralized logging
 * - Prevents stack trace leakage in production
 */
export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): Response {
    // Log error for debugging
    console.error(`[Error] ${err.name}: ${err.message}`);
    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
    }

    // Handle our custom AppError
    if (err instanceof AppError) {
        // Add Retry-After header for rate limiting
        if (err instanceof RateLimitError) {
            res.setHeader('Retry-After', err.retryAfter);
        }

        return sendError(
            res,
            err.statusCode,
            err.code,
            err.message,
            err.isOperational ? err.details : undefined
        );
    }

    // Handle Zod validation errors
    if (err.name === 'ZodError') {
        const zodError = err as unknown as { errors: Array<{ path: (string | number)[]; message: string }> };
        return sendError(
            res,
            400,
            'VALIDATION_ERROR',
            'Validation failed',
            zodError.errors.map(e => ({
                field: e.path.join('.'),
                message: e.message
            }))
        );
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        return sendError(res, 401, 'INVALID_TOKEN', 'Invalid authentication token');
    }

    if (err.name === 'TokenExpiredError') {
        return sendError(res, 401, 'TOKEN_EXPIRED', 'Authentication token has expired');
    }

    // Handle database errors
    if (err.message?.includes('duplicate key')) {
        return sendError(res, 409, 'DUPLICATE_ENTRY', 'Resource already exists');
    }

    if (err.message?.includes('violates foreign key constraint')) {
        return sendError(res, 400, 'REFERENCE_ERROR', 'Referenced resource does not exist');
    }

    // Production: hide internal error details
    if (process.env.NODE_ENV === 'production') {
        return sendError(
            res,
            500,
            'INTERNAL_ERROR',
            'An unexpected error occurred. Please try again later.'
        );
    }

    // Development: show full error details
    return sendError(
        res,
        500,
        'INTERNAL_ERROR',
        err.message,
        { stack: err.stack }
    );
}

/**
 * Handle 404 Not Found
 */
export function notFoundHandler(
    req: Request,
    res: Response
): Response {
    return sendError(
        res,
        404,
        'ROUTE_NOT_FOUND',
        `Cannot ${req.method} ${req.path}`
    );
}
