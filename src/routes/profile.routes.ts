import { Router } from 'express';
import { ProfileController } from '../controllers/profile.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

// ... (Previous routes: basic, register, update, media) ...
router.post('/basic', authenticate, ProfileController.createBasicProfile);

router.post('/register', authenticate, upload.fields([{ name: 'user_profile', maxCount: 1 }, { name: 'photos', maxCount: 5 }]), ProfileController.registerFullProfile);

router.patch('/me', authenticate, upload.fields([{ name: 'user_profile', maxCount: 1 }, { name: 'photos', maxCount: 5 }]), ProfileController.updateMe);

router.post('/media', authenticate, upload.fields([{ name: 'user_profile', maxCount: 1 }, { name: 'photos', maxCount: 5 }]), ProfileController.uploadMedia);

router.delete('/media', authenticate, ProfileController.deleteMedia);

router.get('/me', authenticate, ProfileController.getMe);

// 7. Get Matches (Based on Gender)
router.get('/matches', authenticate, ProfileController.getMatches);

export default router;  