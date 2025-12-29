import bcrypt from 'bcrypt';
import crypto from 'crypto'; // Native Node module for secure random numbers
import { UserRepository } from '../repositories/user.repository';
import { sendOTP } from './email.service';
import { NotificationService } from './notification.service';

export class AuthService {

  private static generateSecureOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Unified Registration (Accepts Email OR Phone)
   * identifier: can be "test@test.com" or "+919876543210"
   * type: "EMAIL" | "PHONE"
   */
 // src/services/auth.service.ts

  static async register(identifier: string, type: 'EMAIL' | 'PHONE', password: string) {
    
    // 1. Check if user exists
    let user = type === 'EMAIL' 
      ? await UserRepository.findByEmail(identifier)
      : await UserRepository.findByPhone(identifier);

    const otp = this.generateSecureOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    let isNewUser = true; // Track if this is a new user or returning unverified user

    // 2. Handle Logic
    if (user) {
      // If already verified, stop
      if ((type === 'EMAIL' && user.is_email_verified) || (type === 'PHONE' && user.is_phone_verified)) {
        throw new Error('USER_ALREADY_EXISTS');
      }
      
      // If not verified, update and resend OTP
      await UserRepository.updateUnverifiedUser(user.user_id, passwordHash, otp, otpExpires);
      isNewUser = false; // Mark as NOT new (existing pending user)
      
    } else {
      // Create new user
      user = await UserRepository.createUser(identifier, type, passwordHash, otp, otpExpires);
      isNewUser = true; // Mark as new
    }

    // 3. Send Notification
    if (type === 'EMAIL') {
      NotificationService.sendEmailOtp(identifier, otp);
    } else {
      NotificationService.sendSmsOtp(identifier, otp);
    }

    // FIX: Now we return both userId AND isNew
    return { 
      userId: user.user_id, 
      isNew: isNewUser 
    };
  }

static async verifyOtp(identifier: string, type: 'EMAIL' | 'PHONE', otp: string) {
    // Dynamic Lookup
    const user = type === 'EMAIL' 
      ? await UserRepository.findByEmail(identifier)
      : await UserRepository.findByPhone(identifier);

    if (!user) throw new Error('USER_NOT_FOUND');
    
    // Check OTP
    const now = new Date();
    if (user.otp_code !== otp || new Date(user.otp_expires_at) < now) {
      throw new Error('INVALID_OTP');
    }

    // Verify User
    await UserRepository.verifyUser(user.user_id);
    
    return user;
  }


  // Add this inside your AuthService class
static async login(identifier: string, password: string, type: 'EMAIL' | 'PHONE') {
    // 1. Find User
    const user = type === 'EMAIL' 
      ? await UserRepository.findByEmail(identifier)
      : await UserRepository.findByPhone(identifier);

    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // 2. Check Verification
    const isVerified = type === 'EMAIL' ? user.is_email_verified : user.is_phone_verified;
    if (!isVerified) {
      throw new Error('USER_NOT_VERIFIED');
    }

    // 3. Check Password
    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass) {
      throw new Error('INVALID_CREDENTIALS');
    }

    return user;
}
}