import { Router } from 'express';
import { ProfileController } from '../controllers/profile.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createProfileSchema, updateProfileSchema } from '../validations/profile.validation';

const router = Router();

// Create Profile
router.post('/', authenticate, validate(createProfileSchema), ProfileController.create);

// Get My Profile
router.get('/me', authenticate, ProfileController.getMe);

// Update My Profile (Use PATCH for partial updates)
// Note: You need to create an updateProfileSchema that makes fields optional using .partial()
router.patch('/me', authenticate, validate(updateProfileSchema), ProfileController.updateMe);

// Get Matches (Recommendations)
router.get('/matches', authenticate, ProfileController.getMatches);

export default router;