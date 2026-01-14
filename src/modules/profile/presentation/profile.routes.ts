import { Router } from 'express';
import {
    createBasicProfile,
    registerFullProfile,
    updateMe,
    getMe,
    getMatches,
    getUserProfile,
    uploadMedia,
    deleteMedia
} from './profile.controller';
import { protect } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import {
    basicProfileSchema,
    fullProfileSchema,
    updateProfileSchema
} from '../../../validations/profile.validation';
import { RateLimiters } from '../../../shared';

/**
 * Profile Routes
 * 
 * Base path: /api/profile
 * All routes require authentication except public profile view
 */
const router = Router();

// Apply rate limiting to all profile routes
router.use(RateLimiters.standard);

/**
 * @route   POST /api/profile/basic
 * @desc    Create basic profile (first step)
 * @access  Private
 */
router.post(
    '/basic',
    protect,
    validate(basicProfileSchema),
    createBasicProfile
);

/**
 * @route   POST /api/profile/register
 * @desc    Register full profile
 * @access  Private
 */
router.post(
    '/register',
    protect,
    validate(fullProfileSchema),
    registerFullProfile
);

/**
 * @route   GET /api/profile/me
 * @desc    Get own profile
 * @access  Private
 */
router.get('/me', protect, getMe);

/**
 * @route   PATCH /api/profile/me
 * @desc    Update own profile
 * @access  Private
 */
router.patch(
    '/me',
    protect,
    validate(updateProfileSchema),
    updateMe
);

/**
 * @route   GET /api/profile/matches
 * @desc    Get matching profiles (cursor paginated)
 * @access  Private
 */
router.get('/matches', protect, getMatches);

/**
 * @route   POST /api/profile/media
 * @desc    Upload photos/profile picture
 * @access  Private
 */
router.post('/media', protect, uploadMedia);

/**
 * @route   DELETE /api/profile/media
 * @desc    Delete photos/profile picture
 * @access  Private
 */
router.delete('/media', protect, deleteMedia);

/**
 * @route   GET /api/profile/:userId
 * @desc    Get public profile of another user
 * @access  Private
 */
router.get('/:userId', protect, getUserProfile);

export default router;
