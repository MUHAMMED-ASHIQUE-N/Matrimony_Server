import { Response } from 'express';

/**
 * Response Formatter - Consistent API Response Structure
 * 
 * @description Ensures all API responses follow the same format.
 * Makes frontend parsing predictable and debugging easier.
 */

export interface SuccessResponse<T> {
    success: true;
    message: string;
    data: T;
    meta?: ResponseMeta;
}

export interface ErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
}

export interface ResponseMeta {
    /** Current page number (for offset pagination) */
    page?: number;
    /** Items per page */
    limit?: number;
    /** Total items available */
    total?: number;
    /** Total pages available */
    totalPages?: number;
    /** Cursor for next page */
    nextCursor?: string | null;
    /** Whether more items exist */
    hasMore?: boolean;
}

/**
 * Send a success response
 * 
 * @example
 * sendSuccess(res, 200, 'User created', { userId: '123' });
 */
export function sendSuccess<T>(
    res: Response,
    statusCode: number,
    message: string,
    data: T,
    meta?: ResponseMeta
): Response {
    const response: SuccessResponse<T> = {
        success: true,
        message,
        data,
        ...(meta ? { meta } : {})
    };

    return res.status(statusCode).json(response);
}

/**
 * Send an error response
 * 
 * @example
 * sendError(res, 400, 'VALIDATION_ERROR', 'Invalid email format');
 */
export function sendError(
    res: Response,
    statusCode: number,
    code: string,
    message: string,
    details?: unknown
): Response {
    const response: ErrorResponse = {
        success: false,
        error: {
            code,
            message,
            ...(details !== undefined ? { details } : {})
        }
    };

    return res.status(statusCode).json(response);
}

/**
 * Send a paginated success response with cursor
 */
export function sendPaginatedSuccess<T>(
    res: Response,
    message: string,
    items: T[],
    pagination: {
        nextCursor: string | null;
        hasMore: boolean;
        total?: number;
    }
): Response {
    return sendSuccess(res, 200, message, items, {
        nextCursor: pagination.nextCursor,
        hasMore: pagination.hasMore,
        ...(pagination.total !== undefined ? { total: pagination.total } : {})
    });
}

/**
 * HTTP Status Code Constants
 */
export const HttpStatus = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
} as const;
