import { Router } from 'express';
import { ProfileController } from '../controllers/profile.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { fullProfileSchema } from '../validations/profile.validation';

const router = Router();

// 1. Basic (Popup)
router.post('/basic', authenticate, ProfileController.createBasicProfile);

// 2. Full Registration (The Long Form)
router.post('/register', authenticate, validate(fullProfileSchema), ProfileController.registerFullProfile);

// 3. Get My Profile
router.get('/me', authenticate, ProfileController.getMe);

// 4. Get Matches
router.get('/matches', authenticate, ProfileController.getMatches);

export default router;