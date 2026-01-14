/**
 * User Entity - Auth Domain Aggregate Root
 * 
 * @description Represents a user in the authentication domain.
 * Contains all business logic related to user authentication.
 * 
 * @pattern DDD Entity - Has identity (userId), encapsulates business rules
 */

export interface UserProps {
    userId: string;
    email: string | null;
    phone: string | null;
    passwordHash: string;
    otpCode: string | null;
    otpExpiresAt: Date | null;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    createdAt: Date;
}

export class User {
    private props: UserProps;

    private constructor(props: UserProps) {
        this.props = Object.freeze({ ...props });
    }

    // Getters - Expose read-only access
    get userId(): string { return this.props.userId; }
    get email(): string | null { return this.props.email; }
    get phone(): string | null { return this.props.phone; }
    get passwordHash(): string { return this.props.passwordHash; }
    get otpCode(): string | null { return this.props.otpCode; }
    get otpExpiresAt(): Date | null { return this.props.otpExpiresAt; }
    get isEmailVerified(): boolean { return this.props.isEmailVerified; }
    get isPhoneVerified(): boolean { return this.props.isPhoneVerified; }
    get createdAt(): Date { return this.props.createdAt; }

    /**
     * Get the primary identifier (email or phone)
     */
    get primaryIdentifier(): string {
        return this.email || this.phone || this.userId;
    }

    /**
     * Check if user has verified their primary contact method
     */
    get isVerified(): boolean {
        if (this.email) return this.isEmailVerified;
        if (this.phone) return this.isPhoneVerified;
        return false;
    }

    /**
     * Create a User entity from database row
     * 
     * @param row - Database row with snake_case keys
     */
    static fromPersistence(row: {
        user_id: string;
        email: string | null;
        phone: string | null;
        password_hash: string;
        otp_code: string | null;
        otp_expires_at: Date | string | null;
        is_email_verified: boolean;
        is_phone_verified: boolean;
        created_at: Date | string;
    }): User {
        return new User({
            userId: row.user_id,
            email: row.email,
            phone: row.phone,
            passwordHash: row.password_hash,
            otpCode: row.otp_code,
            otpExpiresAt: row.otp_expires_at ? new Date(row.otp_expires_at) : null,
            isEmailVerified: row.is_email_verified,
            isPhoneVerified: row.is_phone_verified,
            createdAt: new Date(row.created_at)
        });
    }

    /**
     * Create a new User entity for registration
     */
    static create(props: {
        userId: string;
        identifier: string;
        type: 'EMAIL' | 'PHONE';
        passwordHash: string;
        otpCode: string;
        otpExpiresAt: Date;
    }): User {
        return new User({
            userId: props.userId,
            email: props.type === 'EMAIL' ? props.identifier : null,
            phone: props.type === 'PHONE' ? props.identifier : null,
            passwordHash: props.passwordHash,
            otpCode: props.otpCode,
            otpExpiresAt: props.otpExpiresAt,
            isEmailVerified: false,
            isPhoneVerified: false,
            createdAt: new Date()
        });
    }

    /**
     * Validate OTP
     * 
     * @returns true if OTP is valid and not expired
     */
    validateOtp(inputOtp: string): boolean {
        if (!this.otpCode || !this.otpExpiresAt) {
            return false;
        }

        const now = new Date();
        if (this.otpExpiresAt < now) {
            return false;
        }

        return this.otpCode === inputOtp;
    }

    /**
     * Check if OTP has expired
     */
    isOtpExpired(): boolean {
        if (!this.otpExpiresAt) return true;
        return this.otpExpiresAt < new Date();
    }

    /**
     * Convert to plain object for API response (excludes sensitive data)
     */
    toPublicDTO(): {
        userId: string;
        email: string | null;
        phone: string | null;
        isEmailVerified: boolean;
        isPhoneVerified: boolean;
        createdAt: Date;
    } {
        return {
            userId: this.userId,
            email: this.email,
            phone: this.phone,
            isEmailVerified: this.isEmailVerified,
            isPhoneVerified: this.isPhoneVerified,
            createdAt: this.createdAt
        };
    }
}
