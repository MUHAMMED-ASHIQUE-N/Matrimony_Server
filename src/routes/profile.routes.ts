import { Router } from 'express';
import { ProfileController } from '../controllers/profile.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Create Basic Info (The Popup)
router.post('/basic', authenticate, ProfileController.createBasicProfile);

// Get My Profile
router.get('/me', authenticate, ProfileController.getMe);

// Full Registration / Update (The Long Form)
router.patch('/me', authenticate, ProfileController.updateMe);

// Get Matches (Teaser or Full)
router.get('/matches', authenticate, ProfileController.getMatches);

export default router;