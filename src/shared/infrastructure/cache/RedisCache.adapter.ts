import Redis from 'ioredis';
import { ICacheAdapter } from './CacheAdapter.interface';

/**
 * Redis Cache Adapter
 * 
 * @description Production-ready Redis implementation with connection pooling,
 * automatic reconnection, and graceful degradation.
 * 
 * @why Redis provides:
 * - Persistence across server restarts
 * - Shared cache across multiple server instances (horizontal scaling)
 * - Atomic operations for rate limiting
 * - Sub-millisecond latency
 * 
 * @complexity All operations O(1) except deletePattern which is O(n)
 */
export class RedisCacheAdapter implements ICacheAdapter {
    private client: Redis;
    private isConnected: boolean = false;

    constructor(redisUrl: string) {
        this.client = new Redis(redisUrl, {
            // Connection settings
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => {
                if (times > 10) {
                    console.error('[Redis] Max retries reached, giving up');
                    return null; // Stop retrying
                }
                // Exponential backoff: 100ms, 200ms, 400ms, ...
                return Math.min(times * 100, 3000);
            },

            // Performance settings
            enableReadyCheck: true,
            enableOfflineQueue: true,

            // TLS for production (rediss://)
            tls: redisUrl.startsWith('rediss://') ? {} : undefined
        });

        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        this.client.on('connect', () => {
            console.log('✅ [Redis] Connected');
            this.isConnected = true;
        });

        this.client.on('ready', () => {
            console.log('✅ [Redis] Ready to accept commands');
        });

        this.client.on('error', (err) => {
            console.error('❌ [Redis] Error:', err.message);
            this.isConnected = false;
        });

        this.client.on('close', () => {
            console.log('🔌 [Redis] Connection closed');
            this.isConnected = false;
        });

        this.client.on('reconnecting', () => {
            console.log('🔄 [Redis] Reconnecting...');
        });
    }

    async get<T>(key: string): Promise<T | null> {
        try {
            const value = await this.client.get(key);
            if (value === null) return null;

            return JSON.parse(value) as T;
        } catch (error) {
            console.error(`[Redis] GET error for key ${key}:`, error);
            return null;
        }
    }

    async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
        try {
            const serialized = JSON.stringify(value);
            await this.client.setex(key, ttlSeconds, serialized);
        } catch (error) {
            console.error(`[Redis] SET error for key ${key}:`, error);
        }
    }

    async delete(key: string): Promise<boolean> {
        try {
            const result = await this.client.del(key);
            return result > 0;
        } catch (error) {
            console.error(`[Redis] DEL error for key ${key}:`, error);
            return false;
        }
    }

    async deletePattern(pattern: string): Promise<number> {
        try {
            let deleted = 0;
            let cursor = '0';

            // Use SCAN for non-blocking iteration
            do {
                const [nextCursor, keys] = await this.client.scan(
                    cursor,
                    'MATCH', pattern,
                    'COUNT', 100
                );
                cursor = nextCursor;

                if (keys.length > 0) {
                    const result = await this.client.del(...keys);
                    deleted += result;
                }
            } while (cursor !== '0');

            return deleted;
        } catch (error) {
            console.error(`[Redis] deletePattern error for ${pattern}:`, error);
            return 0;
        }
    }

    async exists(key: string): Promise<boolean> {
        try {
            const result = await this.client.exists(key);
            return result === 1;
        } catch (error) {
            console.error(`[Redis] EXISTS error for key ${key}:`, error);
            return false;
        }
    }

    async expire(key: string, ttlSeconds: number): Promise<boolean> {
        try {
            const result = await this.client.expire(key, ttlSeconds);
            return result === 1;
        } catch (error) {
            console.error(`[Redis] EXPIRE error for key ${key}:`, error);
            return false;
        }
    }

    async increment(key: string, amount: number = 1): Promise<number> {
        try {
            if (amount === 1) {
                return await this.client.incr(key);
            }
            return await this.client.incrby(key, amount);
        } catch (error) {
            console.error(`[Redis] INCR error for key ${key}:`, error);
            return 0;
        }
    }

    async ttl(key: string): Promise<number> {
        try {
            return await this.client.ttl(key);
        } catch (error) {
            console.error(`[Redis] TTL error for key ${key}:`, error);
            return -2;
        }
    }

    async isHealthy(): Promise<boolean> {
        try {
            const pong = await this.client.ping();
            return pong === 'PONG' && this.isConnected;
        } catch {
            return false;
        }
    }

    async disconnect(): Promise<void> {
        await this.client.quit();
        this.isConnected = false;
    }

    /**
     * Get raw Redis client for advanced operations
     * Use sparingly - prefer interface methods
     */
    getRawClient(): Redis {
        return this.client;
    }
}
