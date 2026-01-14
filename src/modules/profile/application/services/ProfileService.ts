import {
    Result,
    NotFoundError,
    decodeCursor,
    CursorPaginatedResult,
    CacheManager,
    CacheKeyBuilder,
    CacheTTL
} from '../../../../shared';
import {
    IProfileRepository,
    MatchCriteria,
    ProfileCursor,
    CreateProfileDTO,
    ProfileMatchResponseDTO
} from '../interfaces';
import { Profile } from '../../domain/entities/Profile.entity';

/**
 * Profile Service - Application Layer
 * 
 * @description Orchestrates profile-related use cases.
 * Handles business logic and delegates persistence to repository.
 */
export class ProfileService {
    private repository: IProfileRepository;

    constructor(repository: IProfileRepository) {
        this.repository = repository;
    }

    /**
     * Get user's own profile (with cache-aside pattern)
     * 
     * @description Checks cache first (O(1)), falls back to DB on miss.
     * Cache TTL: 1 hour (CacheTTL.MEDIUM)
     * 
     * @complexity O(1) cache hit, O(log n) cache miss
     */
    async getMyProfile(userId: string): Promise<Result<Profile, Error>> {
        const cacheKey = CacheKeyBuilder.profile(userId);

        try {
            // 1. Check cache first
            const cache = CacheManager.getAdapter();
            const cached = await cache.get<ReturnType<Profile['toFullDTO']>>(cacheKey);

            if (cached) {
                // Cache hit - reconstruct Profile from cached DTO
                const profile = Profile.fromPersistence(cached as Record<string, unknown>);
                return Result.ok(profile);
            }
        } catch {
            // Cache unavailable - proceed to DB
            console.warn('[ProfileService] Cache unavailable, falling back to DB');
        }

        // 2. Cache miss - fetch from DB
        const profile = await this.repository.findByUserId(userId);

        if (!profile) {
            return Result.fail(new NotFoundError('Profile'));
        }

        // 3. Populate cache for next request
        try {
            const cache = CacheManager.getAdapter();
            await cache.set(cacheKey, profile.toFullDTO(), CacheTTL.MEDIUM);
        } catch {
            // Cache write failed - non-fatal
        }

        return Result.ok(profile);
    }

    /**
     * Create basic profile (first step after registration)
     */
    async createBasicProfile(
        userId: string,
        data: {
            firstName: string;
            lastName?: string;
            gender: 'Male' | 'Female' | 'Other';
            profileCreatedFor: string;
        }
    ): Promise<Result<Profile, Error>> {
        // Check if profile already exists
        const existing = await this.repository.findByUserId(userId);
        if (existing) {
            // Update instead of error
            const result = await this.repository.updateProfile(userId, data);
            if (result.isSuccess) {
                await this.invalidateProfileCache(userId);
            }
            return result;
        }

        const result = await this.repository.createBasic(userId, data);
        if (result.isSuccess) {
            await this.invalidateProfileCache(userId);
        }
        return result;
    }

    /**
     * Register full profile
     */
    async registerFullProfile(
        userId: string,
        data: CreateProfileDTO
    ): Promise<Result<Profile, Error>> {
        return this.repository.upsertFullProfile(userId, data);
    }

    /**
     * Update profile (with cache invalidation)
     */
    async updateProfile(
        userId: string,
        updates: Partial<CreateProfileDTO>
    ): Promise<Result<Profile, Error>> {
        const result = await this.repository.updateProfile(userId, updates);

        if (result.isSuccess) {
            await this.invalidateProfileCache(userId);
        }

        return result;
    }

    /**
     * Invalidate profile cache
     * 
     * @description Called on any profile mutation to prevent stale data.
     * 
     * @complexity O(1)
     */
    private async invalidateProfileCache(userId: string): Promise<void> {
        try {
            const cache = CacheManager.getAdapter();
            await cache.delete(CacheKeyBuilder.profile(userId));
        } catch {
            // Cache invalidation failed - non-fatal
            console.warn('[ProfileService] Cache invalidation failed for user:', userId);
        }
    }

    /**
     * Get matches with cursor pagination
     * 
     * Uses cursor-based pagination for O(1) access instead of O(N) offset.
     * 
     * @param userId - Current user
     * @param criteria - Filter criteria
     * @param cursorString - Base64 encoded cursor (optional for first page)
     * @param limit - Max results per page (default 20)
     */
    async getMatches(
        userId: string,
        criteria: Partial<MatchCriteria>,
        cursorString?: string,
        limit: number = 20
    ): Promise<Result<ProfileMatchResponseDTO, Error>> {
        // Get user's profile to determine target gender and defaults
        const myProfile = await this.repository.findByUserId(userId);

        if (!myProfile) {
            return Result.fail(new NotFoundError('Profile'));
        }

        // Build criteria with defaults from profile preferences
        const fullCriteria: MatchCriteria = {
            targetGender: myProfile.targetGender,
            minAge: criteria.minAge ?? myProfile.partnerMinAge ?? 18,
            maxAge: criteria.maxAge ?? myProfile.partnerMaxAge ?? 60,
            search: criteria.search,
            location: criteria.location,
            job: criteria.job,
            religion: criteria.religion,
            maritalStatus: criteria.maritalStatus
        };

        // Decode cursor if provided
        let cursor: ProfileCursor | null = null;
        if (cursorString) {
            const decoded = decodeCursor(cursorString);
            if (decoded) {
                cursor = {
                    createdAt: new Date(decoded.sortValue as string),
                    profileId: decoded.id
                };
            }
        }

        // Cap limit to prevent abuse
        const safeLimit = Math.min(Math.max(limit, 1), 50);

        const result = await this.repository.findMatchesCursor(
            userId,
            fullCriteria,
            cursor,
            safeLimit
        );

        return Result.ok({
            profiles: result.items.map((p: Profile) => ({
                profileId: p.profileId,
                userId: p.userId,
                firstName: p.firstName,
                lastName: p.lastName,
                age: p.age,
                occupation: p.occupation,
                presentCountry: p.presentCountry,
                userProfile: p.userProfile,
                tagline: p.tagline
            })),
            nextCursor: result.nextCursor,
            hasMore: result.hasMore
        });
    }

    /**
     * Get public profile (for viewing other users)
     */
    async getPublicProfile(targetUserId: string): Promise<Result<Record<string, unknown>, Error>> {
        const profile = await this.repository.getPublicProfile(targetUserId);

        if (!profile) {
            return Result.fail(new NotFoundError('Profile'));
        }

        return Result.ok(profile.toPublicDTO());
    }

    /**
     * Update media (photos/profile picture)
     */
    async updateMedia(
        userId: string,
        media: { userProfile?: string; photos?: string[] }
    ): Promise<Result<{ userProfile: string | null; photos: string[] }, Error>> {
        return this.repository.updateMedia(userId, media);
    }

    /**
     * Delete media
     */
    async deleteMedia(
        userId: string,
        type: 'user_profile' | 'photos',
        photoUrl?: string
    ): Promise<Result<boolean, Error>> {
        return this.repository.deleteMedia(userId, type, photoUrl);
    }
}
