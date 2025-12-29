import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import jwt from 'jsonwebtoken';

export class AuthController {

  // ... (Keep your existing signup method) ...
  static async signup(req: Request, res: Response, next: NextFunction) {
    // ... (Your existing code) ...
    try {
      const { identifier, type, password } = req.body;
      if (!['EMAIL', 'PHONE'].includes(type)) {
        return res.status(400).json({ message: 'Invalid type. Must be EMAIL or PHONE' });
      }
      const result = await AuthService.register(identifier, type, password);
      res.status(200).json({
        message: result.isNew 
          ? `Registration successful. OTP sent to ${type.toLowerCase()}.` 
          : `Account pending verification. New OTP sent to ${type.toLowerCase()}.`,
        userId: result.userId,
        devHint: process.env.NODE_ENV === 'development' ? 'Check server console for OTP' : undefined
      });
    } catch (error: any) {
      if (error.message === 'USER_ALREADY_EXISTS') {
        return res.status(409).json({ message: 'User already registered. Please login.' });
      }
      next(error);
    }
  }

  // ... (Keep your existing verify method) ...
  static async verify(req: Request, res: Response, next: NextFunction) {
    // ... (Your existing code) ...
    try {
      const { identifier, type, otp } = req.body;
      if (!['EMAIL', 'PHONE'].includes(type)) {
        return res.status(400).json({ message: 'Invalid type. Must be EMAIL or PHONE' });
      }
      const user = await AuthService.verifyOtp(identifier, type, otp);
      const token = jwt.sign(
        { userId: user.user_id },
        process.env.JWT_SECRET as string,
        { expiresIn: '7d' }
      );
      res.status(200).json({
        message: 'Verified successfully. Logged in.',
        token,
        userId: user.user_id
      });
    } catch (error: any) {
      if (error.message === 'INVALID_OTP') return res.status(400).json({ message: 'Invalid or expired OTP' });
      if (error.message === 'USER_NOT_FOUND') return res.status(404).json({ message: 'User not found' });
      next(error);
    }
  }

  // FIX 4: ADD THE MISSING LOGIN METHOD
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { identifier, password, type } = req.body; // Expect type (EMAIL/PHONE) for clarity

      // You need to ensure AuthService has a login method
      const user = await AuthService.login(identifier, password, type);

      const token = jwt.sign(
        { userId: user.user_id },
        process.env.JWT_SECRET as string,
        { expiresIn: '7d' }
      );

      res.status(200).json({
        message: 'Login successful',
        token,
        userId: user.user_id
      });

    } catch (error: any) {
      if (error.message === 'INVALID_CREDENTIALS') {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      if (error.message === 'USER_NOT_VERIFIED') {
        return res.status(403).json({ message: 'Account not verified. Please verify OTP.' });
      }
      next(error);
    }
  }
}