import { Request, Response } from 'express';
import {
    asyncHandler,
    sendSuccess,
    sendError,
    sendPaginatedSuccess,
    HttpStatus
} from '../../../shared';
import { ProfileService } from '../application/services/ProfileService';
import { ProfileRepositoryPostgres } from '../infrastructure/ProfileRepository.postgres';
import { AuthenticatedRequest } from '../../../core/types';

/**
 * Profile Controller
 * 
 * @description Handles HTTP requests for profile management.
 * Thin layer delegating to ProfileService.
 */

// Dependency Injection
const profileRepository = new ProfileRepositoryPostgres();
const profileService = new ProfileService(profileRepository);

/**
 * POST /api/profile/basic
 * Create basic profile after registration
 */
export const createBasicProfile = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const { firstName, lastName, gender, profileCreatedFor } = req.body;

    const result = await profileService.createBasicProfile(userId, {
        firstName,
        lastName,
        gender,
        profileCreatedFor
    });

    if (result.isFailure) {
        const error = result.error;
        return sendError(
            res,
            (error as { statusCode?: number }).statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
            (error as { code?: string }).code || 'PROFILE_CREATE_FAILED',
            error.message
        );
    }

    return sendSuccess(
        res,
        HttpStatus.CREATED,
        'Basic profile created',
        result.value.toFullDTO()
    );
});

/**
 * POST /api/profile/register
 * Register full profile
 */
export const registerFullProfile = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const {
        firstName, lastName, contact, gender, profileCreatedFor,
        dateOfBirth, height, weight, caste, religion, motherTongue, maritalStatus,
        education, college, passoutYear, occupation, company, annualIncome,
        presentCountry, financialStatus, tagline, aboutMe, userProfile,
        photos, hobbies, interests, dietPreference, smoking, drinking,
        // Accept both formats: direct fields OR array formats
        ageRange, heightRange, maritalStatusPreference, religionPreference, distance,
        // Direct field names (preferred)
        partnerMinAge, partnerMaxAge, partnerMinHeight, partnerMaxHeight,
        partnerMaritalPreference, partnerReligionPreference, partnerDistancePreferenceKm
    } = req.body;

    // Parse range fields if provided as arrays, fallback to direct fields
    const parseRange = (val: unknown): number | undefined => {
        if (Array.isArray(val) && val.length >= 1) return Number(val[0]);
        if (typeof val === 'number') return val;
        if (typeof val === 'string' && val) return Number(val);
        return undefined;
    };

    // Helper to get the second element of array range
    const parseRangeMax = (val: unknown): number | undefined => {
        if (Array.isArray(val) && val.length >= 2) return Number(val[1]);
        return undefined;
    };

    const result = await profileService.registerFullProfile(userId, {
        firstName,
        lastName,
        contact,
        gender,
        profileCreatedFor,
        dateOfBirth,
        height: typeof height === 'string' ? parseFloat(height) : height,
        weight: typeof weight === 'string' ? parseFloat(weight) : weight,
        caste,
        religion,
        motherTongue,
        maritalStatus,
        education,
        college,
        passoutYear: typeof passoutYear === 'string' ? parseInt(passoutYear) : passoutYear,
        occupation,
        company,
        annualIncome,
        presentCountry,
        financialStatus,
        tagline,
        aboutMe,
        userProfile,
        photos,
        hobbies,
        interests,
        dietPreference,
        smoking,
        drinking,
        // Prefer direct fields, fallback to array format
        partnerMinAge: partnerMinAge ?? parseRange(ageRange),
        partnerMaxAge: partnerMaxAge ?? parseRangeMax(ageRange),
        partnerMinHeight: partnerMinHeight ?? parseRange(heightRange),
        partnerMaxHeight: partnerMaxHeight ?? parseRangeMax(heightRange),
        partnerMaritalPreference: partnerMaritalPreference ?? maritalStatusPreference,
        partnerReligionPreference: partnerReligionPreference ?? religionPreference,
        partnerDistancePreferenceKm: partnerDistancePreferenceKm ?? (distance ? parseInt(distance) : undefined)
    });

    if (result.isFailure) {
        return sendError(
            res,
            HttpStatus.INTERNAL_SERVER_ERROR,
            'PROFILE_REGISTER_FAILED',
            result.error.message
        );
    }

    return sendSuccess(
        res,
        HttpStatus.OK,
        'Profile registered successfully',
        result.value.toFullDTO()
    );
});

/**
 * PATCH /api/profile/me
 * Update own profile
 */
export const updateMe = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;

    const result = await profileService.updateProfile(userId, req.body);

    if (result.isFailure) {
        return sendError(
            res,
            (result.error as { statusCode?: number }).statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
            (result.error as { code?: string }).code || 'PROFILE_UPDATE_FAILED',
            result.error.message
        );
    }

    return sendSuccess(
        res,
        HttpStatus.OK,
        'Profile updated',
        result.value.toFullDTO()
    );
});

/**
 * GET /api/profile/me
 * Get own profile
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;

    const result = await profileService.getMyProfile(userId);

    if (result.isFailure) {
        return sendError(
            res,
            HttpStatus.NOT_FOUND,
            'PROFILE_NOT_FOUND',
            result.error.message
        );
    }

    return sendSuccess(
        res,
        HttpStatus.OK,
        'Profile retrieved',
        result.value.toFullDTO()
    );
});

/**
 * GET /api/profile/matches
 * Get matching profiles with cursor pagination
 * 
 * Query params:
 * - cursor: Base64 encoded pagination cursor
 * - limit: Max results (1-50, default 20)
 * - search: Name search
 * - location: Country filter
 * - job: Occupation filter
 * - religion: Religion filter
 * - maritalStatus: Marital status filter
 * - minAge, maxAge: Age range filter
 */
export const getMatches = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const { cursor, limit, search, location, job, religion, maritalStatus, minAge, maxAge } = req.query;

    const result = await profileService.getMatches(
        userId,
        {
            search: search as string | undefined,
            location: location as string | undefined,
            job: job as string | undefined,
            religion: religion as string | undefined,
            maritalStatus: maritalStatus as string | undefined,
            minAge: minAge ? parseInt(minAge as string) : undefined,
            maxAge: maxAge ? parseInt(maxAge as string) : undefined
        },
        cursor as string | undefined,
        limit ? parseInt(limit as string) : 20
    );

    if (result.isFailure) {
        return sendError(
            res,
            HttpStatus.NOT_FOUND,
            'MATCHES_FAILED',
            result.error.message
        );
    }

    const data = result.value;

    return sendPaginatedSuccess(
        res,
        'Matches retrieved',
        data.profiles,
        {
            nextCursor: data.nextCursor,
            hasMore: data.hasMore
        }
    );
});

/**
 * GET /api/profile/:userId
 * Get public profile of another user
 */
export const getUserProfile = asyncHandler(async (req: Request, res: Response) => {
    const { userId: targetUserId } = req.params;

    const result = await profileService.getPublicProfile(targetUserId);

    if (result.isFailure) {
        return sendError(
            res,
            HttpStatus.NOT_FOUND,
            'PROFILE_NOT_FOUND',
            result.error.message
        );
    }

    return sendSuccess(
        res,
        HttpStatus.OK,
        'Profile retrieved',
        result.value
    );
});

/**
 * POST /api/profile/media
 * Upload media (photos/profile picture)
 */
export const uploadMedia = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const { userProfile, photos } = req.body;

    const result = await profileService.updateMedia(userId, { userProfile, photos });

    if (result.isFailure) {
        return sendError(
            res,
            HttpStatus.INTERNAL_SERVER_ERROR,
            'MEDIA_UPLOAD_FAILED',
            result.error.message
        );
    }

    return sendSuccess(
        res,
        HttpStatus.OK,
        'Media updated',
        result.value
    );
});

/**
 * DELETE /api/profile/media
 * Delete media
 */
export const deleteMedia = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const { type, photoUrl } = req.body;

    if (!['user_profile', 'photos'].includes(type)) {
        return sendError(
            res,
            HttpStatus.BAD_REQUEST,
            'INVALID_MEDIA_TYPE',
            "Type must be 'user_profile' or 'photos'"
        );
    }

    const result = await profileService.deleteMedia(userId, type, photoUrl);

    if (result.isFailure) {
        return sendError(
            res,
            HttpStatus.INTERNAL_SERVER_ERROR,
            'MEDIA_DELETE_FAILED',
            result.error.message
        );
    }

    return sendSuccess(
        res,
        HttpStatus.OK,
        'Media deleted',
        { success: true }
    );
});
