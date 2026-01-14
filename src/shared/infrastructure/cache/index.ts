import { ICacheAdapter, CacheKeyBuilder, CacheTTL } from './CacheAdapter.interface';
import { InMemoryCacheAdapter } from './InMemoryCache.adapter';
import { RedisCacheAdapter } from './RedisCache.adapter';

/**
 * Cache Manager - Singleton Factory for Cache Adapter
 * 
 * @description Provides a single cache instance across the application.
 * Automatically selects Redis if configured, falls back to in-memory.
 * 
 * @pattern Singleton + Factory
 * 
 * @usage
 * const cache = CacheManager.getInstance();
 * await cache.set('key', value, 3600);
 */
class CacheManagerClass {
    private static instance: CacheManagerClass;
    private adapter: ICacheAdapter | null = null;
    private initialized: boolean = false;

    private constructor() {
        // Private constructor for singleton
    }

    static getInstance(): CacheManagerClass {
        if (!CacheManagerClass.instance) {
            CacheManagerClass.instance = new CacheManagerClass();
        }
        return CacheManagerClass.instance;
    }

    /**
     * Initialize the cache adapter
     * Call this once during application startup
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            console.log('[Cache] Already initialized');
            return;
        }

        const redisUrl = process.env.REDIS_URL;
        const redisEnabled = process.env.REDIS_ENABLED === 'true';

        if (redisEnabled && redisUrl) {
            try {
                console.log('[Cache] Initializing Redis adapter...');
                this.adapter = new RedisCacheAdapter(redisUrl);

                // Wait for connection with timeout
                const healthy = await this.waitForConnection(5000);

                if (healthy) {
                    console.log('✅ [Cache] Using Redis');
                } else {
                    console.warn('⚠️ [Cache] Redis connection failed, falling back to in-memory');
                    await this.adapter.disconnect();
                    this.adapter = new InMemoryCacheAdapter();
                }
            } catch (error) {
                console.warn('⚠️ [Cache] Redis initialization failed:', error);
                this.adapter = new InMemoryCacheAdapter();
                console.log('✅ [Cache] Using in-memory fallback');
            }
        } else {
            console.log('[Cache] Redis not configured, using in-memory cache');
            this.adapter = new InMemoryCacheAdapter();
        }

        this.initialized = true;
    }

    private async waitForConnection(timeoutMs: number): Promise<boolean> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            if (await this.adapter?.isHealthy()) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return false;
    }

    /**
     * Get the cache adapter
     * @throws Error if not initialized
     */
    getAdapter(): ICacheAdapter {
        if (!this.adapter) {
            throw new Error('[Cache] Not initialized. Call CacheManager.initialize() first.');
        }
        return this.adapter;
    }

    /**
     * Graceful shutdown
     */
    async shutdown(): Promise<void> {
        if (this.adapter) {
            await this.adapter.disconnect();
            this.adapter = null;
            this.initialized = false;
            console.log('[Cache] Shutdown complete');
        }
    }

    /**
     * Check if cache is available
     */
    async isHealthy(): Promise<boolean> {
        return this.adapter?.isHealthy() ?? false;
    }
}

// Export singleton instance
export const CacheManager = CacheManagerClass.getInstance();

// Re-export utilities
export { CacheKeyBuilder, CacheTTL, ICacheAdapter };
