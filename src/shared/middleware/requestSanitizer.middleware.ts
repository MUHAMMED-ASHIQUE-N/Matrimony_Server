import { Request, Response, NextFunction } from 'express';

/**
 * Request Sanitizer Middleware
 * 
 * @description Sanitizes user input to prevent XSS and injection attacks.
 * Works alongside Helmet.js for defense in depth.
 * 
 * @why Defense in depth - even if validation misses something,
 * sanitization provides another layer of protection.
 */

/**
 * Characters that could be dangerous in SQL/NoSQL
 */
const DANGEROUS_PATTERNS = [
    /\$where/gi,      // MongoDB injection
    /\$gt/gi,         // MongoDB comparison
    /\$lt/gi,
    /\$ne/gi,
    /\$or/gi,
    /\$and/gi,
    /\$regex/gi,
];

/**
 * Sanitize a single value
 */
function sanitizeValue(value: unknown): unknown {
    if (value === null || value === undefined) {
        return value;
    }

    if (typeof value === 'string') {
        // Remove null bytes
        let sanitized = value.replace(/\0/g, '');

        // Basic XSS prevention - encode HTML entities
        sanitized = sanitized
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');

        return sanitized;
    }

    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }

    if (typeof value === 'object') {
        return sanitizeObject(value as Record<string, unknown>);
    }

    return value;
}

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
        // Check for dangerous MongoDB operators in keys
        if (DANGEROUS_PATTERNS.some(pattern => pattern.test(key))) {
            console.warn(`[Sanitizer] Blocked dangerous key: ${key}`);
            continue; // Skip this key entirely
        }

        // Remove keys starting with $ (MongoDB operators)
        if (key.startsWith('$')) {
            console.warn(`[Sanitizer] Blocked $ prefix key: ${key}`);
            continue;
        }

        sanitized[key] = sanitizeValue(value);
    }

    return sanitized;
}

/**
 * Request Sanitizer Middleware
 * 
 * Sanitizes:
 * - req.body
 * - req.query
 * - req.params
 */
export function requestSanitizer(
    req: Request,
    _res: Response,
    next: NextFunction
): void {
    try {
        // Sanitize body (body is mutable)
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeObject(req.body);
        }

        // Sanitize query params in-place (req.query is read-only in newer Express)
        if (req.query && typeof req.query === 'object') {
            const sanitizedQuery = sanitizeObject(req.query as Record<string, unknown>);
            for (const key of Object.keys(req.query)) {
                delete (req.query as Record<string, unknown>)[key];
            }
            Object.assign(req.query, sanitizedQuery);
        }

        // Sanitize params in-place (req.params may be read-only)
        if (req.params && typeof req.params === 'object') {
            const sanitizedParams = sanitizeObject(req.params);
            for (const key of Object.keys(req.params)) {
                (req.params as Record<string, string>)[key] = sanitizedParams[key] as string;
            }
        }

        next();
    } catch (error) {
        console.error('[Sanitizer] Error:', error);
        next(error);
    }
}

/**
 * Lightweight sanitizer that only removes null bytes and trims
 * Use for endpoints where HTML is expected (like rich text)
 */
export function lightSanitizer(
    req: Request,
    _res: Response,
    next: NextFunction
): void {
    try {
        if (req.body && typeof req.body === 'object') {
            req.body = removeDangerousKeys(req.body);
        }
        next();
    } catch (error) {
        next(error);
    }
}

function removeDangerousKeys(obj: Record<string, unknown>): Record<string, unknown> {
    const cleaned: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith('$')) continue;

        if (typeof value === 'string') {
            cleaned[key] = value.replace(/\0/g, '');
        } else if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
                cleaned[key] = value.map(v =>
                    typeof v === 'object' && v !== null ? removeDangerousKeys(v as Record<string, unknown>) : v
                );
            } else {
                cleaned[key] = removeDangerousKeys(value as Record<string, unknown>);
            }
        } else {
            cleaned[key] = value;
        }
    }

    return cleaned;
}
