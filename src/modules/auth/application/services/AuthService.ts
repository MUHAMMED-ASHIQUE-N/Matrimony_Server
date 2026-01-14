import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import {
    Result,
    ConflictError,
    NotFoundError,
    UnauthorizedError,
    ValidationError,
    sendOtpEmail
} from '../../../../shared';
import {
    IAuthRepository,
    RegisterRequestDTO,
    RegisterResponseDTO,
    VerifyOtpRequestDTO,
    VerifyOtpResponseDTO,
    LoginRequestDTO,
    LoginResponseDTO
} from '../interfaces';
import { User } from '../../domain/entities/User.entity';

/**
 * Auth Service - Application Layer
 * 
 * @description Orchestrates authentication use cases.
 * Contains business logic but delegates persistence to repository.
 * 
 * @pattern Use Case / Application Service
 */
export class AuthService {
    private repository: IAuthRepository;

    constructor(repository: IAuthRepository) {
        this.repository = repository;
    }

    /**
     * Generate cryptographically secure 6-digit OTP
     * Time Complexity: O(1)
     */
    private generateSecureOTP(): string {
        return crypto.randomInt(100000, 999999).toString();
    }

    /**
     * Hash password with bcrypt
     * Time Complexity: O(2^10) - bcrypt cost factor
     */
    private async hashPassword(password: string): Promise<string> {
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(password, salt);
    }

    /**
     * Generate JWT token
     * Time Complexity: O(1)
     */
    private generateToken(userId: string): string {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET not configured');
        }

        return jwt.sign(
            { userId },
            secret,
            { expiresIn: '7d' }
        );
    }

    /**
     * Find user by identifier (email or phone)
     */
    private async findByIdentifier(
        identifier: string,
        type: 'EMAIL' | 'PHONE'
    ): Promise<User | null> {
        return type === 'EMAIL'
            ? await this.repository.findByEmail(identifier)
            : await this.repository.findByPhone(identifier);
    }

    /**
     * Register Use Case
     * 
     * @description Creates new user or resends OTP for unverified user.
     * 
     * Flow:
     * 1. Check if user exists
     * 2. If verified user exists -> error
     * 3. If unverified user exists -> resend OTP
     * 4. If no user -> create new
     * 5. Send OTP notification
     * 
     * @returns Result with userId and isNew flag
     */
    async register(data: RegisterRequestDTO): Promise<Result<RegisterResponseDTO, Error>> {
        const { identifier, type, password } = data;

        // 1. Find existing user
        const existingUser = await this.findByIdentifier(identifier, type);

        const otp = this.generateSecureOTP();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        const passwordHash = await this.hashPassword(password);

        // 2. Handle existing verified user
        if (existingUser) {
            const isVerified = type === 'EMAIL'
                ? existingUser.isEmailVerified
                : existingUser.isPhoneVerified;

            if (isVerified) {
                return Result.fail(new ConflictError('User already registered and verified. Please login.'));
            }

            // 3. Resend OTP for unverified user
            const updateResult = await this.repository.updateOtp(
                existingUser.userId,
                otp,
                otpExpiresAt,
                passwordHash
            );

            if (updateResult.isFailure) {
                return Result.fail(updateResult.error);
            }

            // Send OTP via email for EMAIL type
            if (type === 'EMAIL') {
                const emailSent = await sendOtpEmail(identifier, otp);
                if (!emailSent) {
                    console.warn(`[AuthService] Failed to send OTP email to ${identifier}`);
                }
            }

            // Log OTP in development
            if (process.env.NODE_ENV === 'development') {
                console.log(`[DEV] OTP for ${identifier}: ${otp}`);
            }

            return Result.ok({
                userId: existingUser.userId,
                isNew: false,
                message: `Account pending verification. New OTP sent to ${type.toLowerCase()}.`
            });
        }

        // 4. Create new user
        const createResult = await this.repository.create({
            identifier,
            type,
            passwordHash,
            otpCode: otp,
            otpExpiresAt
        });

        if (createResult.isFailure) {
            return Result.fail(createResult.error);
        }

        const newUser = createResult.value;

        // Send OTP via email for EMAIL type
        if (type === 'EMAIL') {
            const emailSent = await sendOtpEmail(identifier, otp);
            if (!emailSent) {
                console.warn(`[AuthService] Failed to send OTP email to ${identifier}`);
            }
        }

        // Log OTP in development
        if (process.env.NODE_ENV === 'development') {
            console.log(`[DEV] OTP for ${identifier}: ${otp}`);
        }

        return Result.ok({
            userId: newUser.userId,
            isNew: true,
            message: `Registration successful. OTP sent to ${type.toLowerCase()}.`
        });
    }

    /**
     * Verify OTP Use Case
     * 
     * @description Verifies OTP and marks user as verified.
     * 
     * Flow:
     * 1. Find user by identifier
     * 2. Validate OTP
     * 3. Mark user as verified
     * 4. Generate JWT token
     */
    async verifyOtp(data: VerifyOtpRequestDTO): Promise<Result<VerifyOtpResponseDTO, Error>> {
        const { identifier, type, otp } = data;

        // 1. Find user
        const user = await this.findByIdentifier(identifier, type);

        if (!user) {
            return Result.fail(new NotFoundError('User'));
        }

        // 2. Validate OTP
        if (!user.validateOtp(otp)) {
            return Result.fail(new ValidationError('Invalid or expired OTP'));
        }

        // 3. Mark as verified
        const verifyResult = await this.repository.verify(user.userId, type);

        if (verifyResult.isFailure) {
            return Result.fail(verifyResult.error);
        }

        const verifiedUser = verifyResult.value;

        // 4. Generate token
        const token = this.generateToken(verifiedUser.userId);

        return Result.ok({
            token,
            userId: verifiedUser.userId,
            user: verifiedUser.toPublicDTO()
        });
    }

    /**
     * Login Use Case
     * 
     * @description Authenticates user with password.
     * 
     * Flow:
     * 1. Find user by identifier
     * 2. Check if verified
     * 3. Validate password
     * 4. Generate JWT token
     */
    async login(data: LoginRequestDTO): Promise<Result<LoginResponseDTO, Error>> {
        const { identifier, type, password } = data;

        // 1. Find user
        const user = await this.findByIdentifier(identifier, type);

        if (!user) {
            return Result.fail(new UnauthorizedError('Invalid credentials'));
        }

        // 2. Check verification - return special error with userId for resend OTP
        const isVerified = type === 'EMAIL' ? user.isEmailVerified : user.isPhoneVerified;

        if (!isVerified) {
            // Create a custom error with userId so frontend can offer resend OTP
            const error = new UnauthorizedError('Account not verified. Please verify OTP first.');
            (error as any).userId = user.userId;
            (error as any).code = 'ACCOUNT_NOT_VERIFIED';
            (error as any).canResendOtp = true;
            return Result.fail(error);
        }

        // 3. Validate password
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);

        if (!isValidPassword) {
            return Result.fail(new UnauthorizedError('Invalid credentials'));
        }

        // 4. Generate token
        const token = this.generateToken(user.userId);

        return Result.ok({
            token,
            userId: user.userId,
            user: user.toPublicDTO()
        });
    }

    /**
     * Resend OTP Use Case
     * 
     * @description Resends OTP to an unverified user.
     * 
     * Flow:
     * 1. Find user by identifier
     * 2. Check if already verified -> error
     * 3. Generate new OTP
     * 4. Send OTP via email/SMS
     */
    async resendOtp(data: { identifier: string; type: 'EMAIL' | 'PHONE' }): Promise<Result<{ userId: string; message: string }, Error>> {
        const { identifier, type } = data;

        // 1. Find user
        const user = await this.findByIdentifier(identifier, type);

        if (!user) {
            return Result.fail(new NotFoundError('User not found. Please sign up first.'));
        }

        // 2. Check if already verified
        const isVerified = type === 'EMAIL' ? user.isEmailVerified : user.isPhoneVerified;

        if (isVerified) {
            return Result.fail(new ConflictError('Account already verified. Please login.'));
        }

        // 3. Generate new OTP
        const otp = this.generateSecureOTP();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const updateResult = await this.repository.updateOtp(user.userId, otp, otpExpiresAt);

        if (updateResult.isFailure) {
            return Result.fail(updateResult.error);
        }

        // 4. Send OTP via email for EMAIL type
        if (type === 'EMAIL') {
            const emailSent = await sendOtpEmail(identifier, otp);
            if (!emailSent) {
                console.warn(`[AuthService] Failed to send OTP email to ${identifier}`);
            }
        }

        // Log OTP in development
        if (process.env.NODE_ENV === 'development') {
            console.log(`[DEV] OTP for ${identifier}: ${otp}`);
        }

        return Result.ok({
            userId: user.userId,
            message: `OTP resent to ${type.toLowerCase()}.`
        });
    }

    /**
     * Get user by ID
     */
    async getUserById(userId: string): Promise<Result<User, Error>> {
        const user = await this.repository.findById(userId);

        if (!user) {
            return Result.fail(new NotFoundError('User'));
        }

        return Result.ok(user);
    }
}
