import { Router } from 'express';
// FIX 1: Remove '.ts' extension
import { AuthController } from '../controllers/auth.controller'; 
import { validate } from '../middlewares/validate.middleware';
import {
    signupSchema,
    verifyOtpSchema,
    loginSchema
} from '../validations/auth.validation';

const router = Router();

// 1. Signup (Email/Phone + Password -> OTP)
router.post('/signup', validate(signupSchema), AuthController.signup);

// 2. Verify OTP (Email/Phone + OTP -> Auth Token)
// FIX 2: Method is now called 'verify', not 'verifyEmail'
router.post('/verify-otp', validate(verifyOtpSchema), AuthController.verify); 

// FIX 3: Removed '/set-password' route. 
// Why? In the new flow, the user provides the password during signup.

// 4. Login
router.post('/login', validate(loginSchema), AuthController.login);

export default router;