import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from '../errors/AppError';
import { CacheManager, CacheKeyBuilder, CacheTTL } from '../infrastructure/cache';

/**
 * Token Bucket Rate Limiter
 * 
 * @description Implements Token Bucket algorithm for rate limiting.
 * More fair than fixed window (no burst at window reset).
 * 
 * @algorithm Token Bucket:
 * - Bucket starts with N tokens (capacity)
 * - Each request consumes 1 token
 * - Tokens refill at R tokens/second
 * - If bucket empty, request is rejected
 * 
 * @complexity O(1) per request
 * 
 * @example
 * // 100 requests per minute with burst of 10
 * app.use(rateLimiter({ capacity: 10, refillRate: 100/60 }));
 */

interface RateLimiterOptions {
    /** Max tokens in bucket (burst capacity) */
    capacity: number;
    /** Tokens added per second */
    refillRate: number;
    /** Key extractor function (default: IP address) */
    keyExtractor?: (req: Request) => string;
    /** Skip rate limiting for certain requests */
    skip?: (req: Request) => boolean;
    /** Custom error message */
    message?: string;
}

interface TokenBucket {
    tokens: number;
    lastRefill: number;
}

// In-memory fallback for rate limiting
const inMemoryBuckets = new Map<string, TokenBucket>();

/**
 * Create rate limiter middleware
 */
export function rateLimiter(options: RateLimiterOptions) {
    const {
        capacity,
        refillRate,
        keyExtractor = defaultKeyExtractor,
        skip,
        message = 'Too many requests. Please slow down.'
    } = options;

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // Skip if configured
        if (skip && skip(req)) {
            return next();
        }

        const clientKey = keyExtractor(req);
        const cacheKey = CacheKeyBuilder.rateLimit(clientKey);

        try {
            const allowed = await checkRateLimit(cacheKey, capacity, refillRate);

            if (!allowed) {
                const retryAfter = Math.ceil(1 / refillRate);
                throw new RateLimitError(retryAfter);
            }

            // Add rate limit headers
            res.setHeader('X-RateLimit-Limit', capacity);
            res.setHeader('X-RateLimit-Remaining', Math.max(0, capacity - 1));

            next();
        } catch (error) {
            if (error instanceof RateLimitError) {
                res.setHeader('Retry-After', error.retryAfter);
                return next(error);
            }
            // On cache error, fail open (allow request)
            console.warn('[RateLimiter] Cache error, allowing request:', error);
            next();
        }
    };
}

/**
 * Check rate limit using Token Bucket algorithm
 * Time Complexity: O(1)
 */
async function checkRateLimit(
    key: string,
    capacity: number,
    refillRate: number
): Promise<boolean> {
    const now = Date.now();

    try {
        const cache = CacheManager.getAdapter();
        const bucketData = await cache.get<TokenBucket>(key);

        let bucket: TokenBucket;

        if (!bucketData) {
            // First request - create new bucket
            bucket = { tokens: capacity - 1, lastRefill: now };
        } else {
            // Calculate token refill
            const elapsed = (now - bucketData.lastRefill) / 1000;
            const refilled = Math.min(
                capacity,
                bucketData.tokens + elapsed * refillRate
            );

            if (refilled < 1) {
                // No tokens available
                return false;
            }

            bucket = { tokens: refilled - 1, lastRefill: now };
        }

        // Save updated bucket
        await cache.set(key, bucket, CacheTTL.RATE_LIMIT);
        return true;

    } catch {
        // Fallback to in-memory if cache fails
        return checkRateLimitInMemory(key, capacity, refillRate, now);
    }
}

/**
 * In-memory fallback for rate limiting
 */
function checkRateLimitInMemory(
    key: string,
    capacity: number,
    refillRate: number,
    now: number
): boolean {
    let bucket = inMemoryBuckets.get(key);

    if (!bucket) {
        bucket = { tokens: capacity - 1, lastRefill: now };
        inMemoryBuckets.set(key, bucket);
        return true;
    }

    // Calculate token refill
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillRate);
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
        return false;
    }

    bucket.tokens -= 1;
    return true;
}

/**
 * Default key extractor - uses IP address
 */
function defaultKeyExtractor(req: Request): string {
    // Handle proxied requests
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
        return ips.trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Preset rate limiters for different endpoints
 */
export const RateLimiters = {
    /** Strict: 10 req/min for auth endpoints */
    auth: rateLimiter({
        capacity: 10,
        refillRate: 10 / 60, // 10 tokens per minute
        message: 'Too many authentication attempts. Please wait.'
    }),

    /** Standard: 100 req/min for general API */
    standard: rateLimiter({
        capacity: 100,
        refillRate: 100 / 60
    }),

    /** Relaxed: 300 req/min for read-heavy endpoints */
    relaxed: rateLimiter({
        capacity: 300,
        refillRate: 300 / 60
    }),

    /** Strict by user ID for write operations */
    userStrict: rateLimiter({
        capacity: 20,
        refillRate: 20 / 60,
        keyExtractor: (req) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const user = (req as any).user;
            return user?.userId || defaultKeyExtractor(req);
        }
    })
};
