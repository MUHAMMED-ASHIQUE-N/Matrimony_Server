import { Result } from '../../../shared';
import { User } from '../domain/entities/User.entity';

/**
 * Auth Repository Interface
 * 
 * @description Defines the contract for user persistence operations.
 * Implementation will be in infrastructure layer.
 * 
 * @pattern Repository - Abstracts data access from business logic
 */
export interface IAuthRepository {
    /**
     * Find user by email
     * Time Complexity: O(1) with index
     */
    findByEmail(email: string): Promise<User | null>;

    /**
     * Find user by phone
     * Time Complexity: O(1) with index
     */
    findByPhone(phone: string): Promise<User | null>;

    /**
     * Find user by ID
     * Time Complexity: O(1) with primary key
     */
    findById(userId: string): Promise<User | null>;

    /**
     * Create a new user
     */
    create(data: {
        identifier: string;
        type: 'EMAIL' | 'PHONE';
        passwordHash: string;
        otpCode: string;
        otpExpiresAt: Date;
    }): Promise<Result<User, Error>>;

    /**
     * Update user's OTP (for resending)
     */
    updateOtp(
        userId: string,
        otpCode: string,
        otpExpiresAt: Date,
        passwordHash?: string
    ): Promise<Result<User, Error>>;

    /**
     * Mark user as verified
     */
    verify(userId: string, type: 'EMAIL' | 'PHONE'): Promise<Result<User, Error>>;

    /**
     * Update password
     */
    updatePassword(userId: string, passwordHash: string): Promise<Result<User, Error>>;
}

/**
 * Registration request DTO
 */
export interface RegisterRequestDTO {
    identifier: string;
    type: 'EMAIL' | 'PHONE';
    password: string;
}

/**
 * Registration response DTO
 */
export interface RegisterResponseDTO {
    userId: string;
    isNew: boolean;
    message: string;
}

/**
 * Verify OTP request DTO
 */
export interface VerifyOtpRequestDTO {
    identifier: string;
    type: 'EMAIL' | 'PHONE';
    otp: string;
}

/**
 * Verify OTP response DTO
 */
export interface VerifyOtpResponseDTO {
    token: string;
    userId: string;
    user: {
        userId: string;
        email: string | null;
        phone: string | null;
        isEmailVerified: boolean;
        isPhoneVerified: boolean;
    };
}

/**
 * Login request DTO
 */
export interface LoginRequestDTO {
    identifier: string;
    type: 'EMAIL' | 'PHONE';
    password: string;
}

/**
 * Login response DTO
 */
export interface LoginResponseDTO {
    token: string;
    userId: string;
    user: {
        userId: string;
        email: string | null;
        phone: string | null;
        isEmailVerified: boolean;
        isPhoneVerified: boolean;
    };
}
