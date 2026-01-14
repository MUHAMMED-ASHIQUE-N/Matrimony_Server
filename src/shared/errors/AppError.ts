/**
 * AppError - Base Error Class for Application Errors
 * 
 * @description Provides consistent error handling across the application.
 * Distinguishes between operational errors (expected, like validation)
 * and programmer errors (bugs that should crash the app).
 * 
 * @example
 * throw new AppError('User not found', 404, 'USER_NOT_FOUND');
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly isOperational: boolean;
    public readonly details?: unknown;

    constructor(
        message: string,
        statusCode: number = 500,
        code: string = 'INTERNAL_ERROR',
        isOperational: boolean = true,
        details?: unknown
    ) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        this.details = details;

        // Maintains proper stack trace for where error was thrown
        Error.captureStackTrace(this, this.constructor);
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

/**
 * ValidationError - Input validation failures (400)
 */
export class ValidationError extends AppError {
    constructor(message: string, details?: unknown) {
        super(message, 400, 'VALIDATION_ERROR', true, details);
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

/**
 * NotFoundError - Resource not found (404)
 */
export class NotFoundError extends AppError {
    constructor(resource: string = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND', true);
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}

/**
 * UnauthorizedError - Authentication required (401)
 */
export class UnauthorizedError extends AppError {
    constructor(message: string = 'Authentication required') {
        super(message, 401, 'UNAUTHORIZED', true);
        Object.setPrototypeOf(this, UnauthorizedError.prototype);
    }
}

/**
 * ForbiddenError - Access denied (403)
 */
export class ForbiddenError extends AppError {
    constructor(message: string = 'Access denied') {
        super(message, 403, 'FORBIDDEN', true);
        Object.setPrototypeOf(this, ForbiddenError.prototype);
    }
}

/**
 * ConflictError - Resource conflict (409)
 */
export class ConflictError extends AppError {
    constructor(message: string = 'Resource already exists') {
        super(message, 409, 'CONFLICT', true);
        Object.setPrototypeOf(this, ConflictError.prototype);
    }
}

/**
 * RateLimitError - Too many requests (429)
 */
export class RateLimitError extends AppError {
    public readonly retryAfter: number;

    constructor(retryAfterSeconds: number = 60) {
        super('Too many requests. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED', true);
        this.retryAfter = retryAfterSeconds;
        Object.setPrototypeOf(this, RateLimitError.prototype);
    }
}

/**
 * DatabaseError - Database operation failures (500)
 */
export class DatabaseError extends AppError {
    constructor(message: string = 'Database operation failed') {
        super(message, 500, 'DATABASE_ERROR', true);
        Object.setPrototypeOf(this, DatabaseError.prototype);
    }
}
