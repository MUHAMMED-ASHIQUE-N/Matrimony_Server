import { Result, CursorPaginatedResult } from '../../../shared';
import { Profile } from '../domain/entities/Profile.entity';

/**
 * Match Criteria - Search/Filter Parameters
 */
export interface MatchCriteria {
    targetGender: 'Male' | 'Female' | 'Other';
    minAge: number;
    maxAge: number;
    search?: string;
    location?: string;
    job?: string;
    religion?: string;
    maritalStatus?: string;
}

/**
 * Cursor for profile pagination
 */
export interface ProfileCursor {
    createdAt: Date;
    profileId: string;
}

/**
 * Profile Repository Interface
 * 
 * @description Contract for profile data access.
 * All implementations must support cursor-based pagination.
 */
export interface IProfileRepository {
    /**
     * Find profile by user ID
     * Time Complexity: O(1) with index
     */
    findByUserId(userId: string): Promise<Profile | null>;

    /**
     * Find profile by profile ID
     * Time Complexity: O(1) with primary key
     */
    findByProfileId(profileId: string): Promise<Profile | null>;

    /**
     * Create a basic profile
     */
    createBasic(userId: string, data: {
        firstName: string;
        lastName?: string;
        gender: 'Male' | 'Female' | 'Other';
        profileCreatedFor: string;
    }): Promise<Result<Profile, Error>>;

    /**
     * Upsert full profile data
     */
    upsertFullProfile(userId: string, data: CreateProfileDTO): Promise<Result<Profile, Error>>;

    /**
     * Update profile fields
     */
    updateProfile(userId: string, updates: Partial<CreateProfileDTO>): Promise<Result<Profile, Error>>;

    /**
     * Find matches with cursor-based pagination
     * Time Complexity: O(1) index seek + O(k) for k results
     * 
     * @param userId - Current user (excluded from results)
     * @param criteria - Filter criteria
     * @param cursor - Pagination cursor (optional for first page)
     * @param limit - Max results per page
     */
    findMatchesCursor(
        userId: string,
        criteria: MatchCriteria,
        cursor: ProfileCursor | null,
        limit: number
    ): Promise<CursorPaginatedResult<Profile>>;

    /**
     * Get public profile (for viewing others)
     */
    getPublicProfile(targetUserId: string): Promise<Profile | null>;

    /**
     * Update media (photos/user_profile)
     */
    updateMedia(userId: string, media: {
        userProfile?: string;
        photos?: string[];
    }): Promise<Result<{ userProfile: string | null; photos: string[] }, Error>>;

    /**
     * Delete media
     */
    deleteMedia(userId: string, type: 'user_profile' | 'photos', photoUrl?: string): Promise<Result<boolean, Error>>;
}

/**
 * Create/Update Profile DTO
 */
export interface CreateProfileDTO {
    firstName: string;
    lastName?: string;
    contact?: string;
    gender: 'Male' | 'Female' | 'Other';
    profileCreatedFor: string;
    dateOfBirth?: string;
    height?: number;
    weight?: number;
    caste?: string;
    religion?: string;
    motherTongue?: string;
    maritalStatus?: string;
    education?: string;
    college?: string;
    passoutYear?: number;
    occupation?: string;
    company?: string;
    annualIncome?: string;
    presentCountry?: string;
    financialStatus?: string;
    tagline?: string;
    aboutMe?: string;
    photos?: string[];
    userProfile?: string;
    hobbies?: string[];
    interests?: string[];
    dietPreference?: string;
    smoking?: string;
    drinking?: string;
    partnerMinAge?: number;
    partnerMaxAge?: number;
    partnerMinHeight?: number;
    partnerMaxHeight?: number;
    partnerMaritalPreference?: string;
    partnerReligionPreference?: string;
    partnerDistancePreferenceKm?: number;
}

/**
 * Profile Match Response DTO
 */
export interface ProfileMatchResponseDTO {
    profiles: Array<{
        profileId: string;
        userId: string;
        firstName: string;
        lastName: string;
        age: number | null;
        occupation: string | null;
        presentCountry: string | null;
        userProfile: string | null;
        tagline: string | null;
    }>;
    nextCursor: string | null;
    hasMore: boolean;
}
