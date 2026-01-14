/**
 * Cache Adapter Interface
 * 
 * @description Abstract interface for caching implementations.
 * Allows swapping between Redis, Memory, or other cache backends
 * without changing business logic.
 * 
 * @pattern Adapter Pattern - Decouples application from specific cache provider
 */
export interface ICacheAdapter {
    /**
     * Get a value from cache
     * Time Complexity: O(1) for most implementations
     * 
     * @param key - Cache key
     * @returns Cached value or null if not found/expired
     */
    get<T>(key: string): Promise<T | null>;

    /**
     * Set a value in cache with TTL
     * Time Complexity: O(1)
     * 
     * @param key - Cache key
     * @param value - Value to cache (will be JSON serialized)
     * @param ttlSeconds - Time to live in seconds
     */
    set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;

    /**
     * Delete a key from cache
     * Time Complexity: O(1)
     */
    delete(key: string): Promise<boolean>;

    /**
     * Delete all keys matching a pattern
     * Time Complexity: O(n) where n is matching keys
     * 
     * @param pattern - Glob pattern (e.g., 'matrimony:profile:*')
     */
    deletePattern(pattern: string): Promise<number>;

    /**
     * Check if key exists
     * Time Complexity: O(1)
     */
    exists(key: string): Promise<boolean>;

    /**
     * Set expiry on existing key
     * Time Complexity: O(1)
     */
    expire(key: string, ttlSeconds: number): Promise<boolean>;

    /**
     * Increment a counter (atomic)
     * Useful for rate limiting
     * Time Complexity: O(1)
     * 
     * @returns New value after increment
     */
    increment(key: string, amount?: number): Promise<number>;

    /**
     * Get remaining TTL for a key
     * Time Complexity: O(1)
     * 
     * @returns TTL in seconds, -1 if no expiry, -2 if key doesn't exist
     */
    ttl(key: string): Promise<number>;

    /**
     * Health check
     */
    isHealthy(): Promise<boolean>;

    /**
     * Graceful shutdown
     */
    disconnect(): Promise<void>;
}

/**
 * Cache key builder with consistent naming
 */
export class CacheKeyBuilder {
    private static readonly PREFIX = 'matrimony';

    /**
     * Build a cache key with consistent naming
     * Format: matrimony:{module}:{entity}:{id}
     */
    static build(module: string, entity: string, id: string): string {
        return `${this.PREFIX}:${module}:${entity}:${id}`;
    }

    /**
     * Build a pattern for bulk operations
     * Example: matrimony:profile:* for all profile keys
     */
    static pattern(module: string, entity?: string): string {
        if (entity) {
            return `${this.PREFIX}:${module}:${entity}:*`;
        }
        return `${this.PREFIX}:${module}:*`;
    }

    // Predefined key builders
    static user(userId: string): string {
        return this.build('auth', 'user', userId);
    }

    static profile(userId: string): string {
        return this.build('profile', 'data', userId);
    }

    static matches(userId: string, cursorHash: string): string {
        return this.build('profile', 'matches', `${userId}:${cursorHash}`);
    }

    static rateLimit(identifier: string): string {
        return this.build('ratelimit', 'bucket', identifier);
    }

    static session(sessionId: string): string {
        return this.build('auth', 'session', sessionId);
    }
}

/**
 * Common TTL values in seconds
 */
export const CacheTTL = {
    /** 5 minutes - for frequently changing data */
    SHORT: 300,
    /** 1 hour - for profile data */
    MEDIUM: 3600,
    /** 24 hours - for rarely changing data */
    LONG: 86400,
    /** 7 days - for sessions */
    SESSION: 604800,
    /** 1 minute - for rate limit buckets */
    RATE_LIMIT: 60
} as const;
