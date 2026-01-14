import { ICacheAdapter } from './CacheAdapter.interface';

/**
 * In-Memory Cache Adapter
 * 
 * @description Simple in-memory cache for development and testing.
 * Falls back to this when Redis is unavailable.
 * 
 * @why Development doesn't need Redis, but code stays consistent.
 * Also serves as fallback if Redis connection fails.
 * 
 * @complexity All operations O(1) except deletePattern which is O(n)
 */
export class InMemoryCacheAdapter implements ICacheAdapter {
    private cache: Map<string, { value: unknown; expiresAt: number }>;
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.cache = new Map();
        // Cleanup expired entries every minute
        this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    }

    async get<T>(key: string): Promise<T | null> {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.value as T;
    }

    async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
        const expiresAt = Date.now() + ttlSeconds * 1000;
        this.cache.set(key, { value, expiresAt });
    }

    async delete(key: string): Promise<boolean> {
        return this.cache.delete(key);
    }

    async deletePattern(pattern: string): Promise<number> {
        // Convert glob pattern to regex
        const regex = new RegExp(
            '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
        );

        let deleted = 0;
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                deleted++;
            }
        }

        return deleted;
    }

    async exists(key: string): Promise<boolean> {
        const entry = this.cache.get(key);
        if (!entry) return false;

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }

    async expire(key: string, ttlSeconds: number): Promise<boolean> {
        const entry = this.cache.get(key);
        if (!entry) return false;

        entry.expiresAt = Date.now() + ttlSeconds * 1000;
        return true;
    }

    async increment(key: string, amount: number = 1): Promise<number> {
        const entry = this.cache.get(key);

        if (!entry || Date.now() > entry.expiresAt) {
            // Key doesn't exist or expired, start at 0 + amount
            await this.set(key, amount, 60); // Default 60s TTL for counters
            return amount;
        }

        const newValue = (typeof entry.value === 'number' ? entry.value : 0) + amount;
        entry.value = newValue;
        return newValue;
    }

    async ttl(key: string): Promise<number> {
        const entry = this.cache.get(key);

        if (!entry) return -2;

        const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
        return remaining > 0 ? remaining : -2;
    }

    async isHealthy(): Promise<boolean> {
        return true; // In-memory is always "healthy"
    }

    async disconnect(): Promise<void> {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.cache.clear();
    }

    /**
     * Remove expired entries
     * Called periodically to prevent memory leaks
     */
    private cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Get cache stats (for debugging)
     */
    getStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}
