import db from '../../../config/db';
import { Result, DatabaseError } from '../../../shared';
import { User } from '../domain/entities/User.entity';
import { IAuthRepository } from '../application/interfaces';

/**
 * PostgreSQL Auth Repository Implementation
 * 
 * @description Implements IAuthRepository for PostgreSQL database.
 * All SQL uses parameterized queries to prevent injection.
 * 
 * @pattern Repository Implementation - Concrete data access
 */
export class AuthRepositoryPostgres implements IAuthRepository {

    /**
     * Find user by email
     * Time Complexity: O(1) with unique index on email
     */
    async findByEmail(email: string): Promise<User | null> {
        try {
            const result = await db.query(
                'SELECT * FROM users WHERE email = $1',
                [email]
            );

            if (result.rows.length === 0) {
                return null;
            }

            return User.fromPersistence(result.rows[0]);
        } catch (error) {
            console.error('[AuthRepository] findByEmail error:', error);
            return null;
        }
    }

    /**
     * Find user by phone
     * Time Complexity: O(1) with unique index on phone
     */
    async findByPhone(phone: string): Promise<User | null> {
        try {
            const result = await db.query(
                'SELECT * FROM users WHERE phone = $1',
                [phone]
            );

            if (result.rows.length === 0) {
                return null;
            }

            return User.fromPersistence(result.rows[0]);
        } catch (error) {
            console.error('[AuthRepository] findByPhone error:', error);
            return null;
        }
    }

    /**
     * Find user by ID
     * Time Complexity: O(1) with primary key
     */
    async findById(userId: string): Promise<User | null> {
        try {
            const result = await db.query(
                'SELECT * FROM users WHERE user_id = $1',
                [userId]
            );

            if (result.rows.length === 0) {
                return null;
            }

            return User.fromPersistence(result.rows[0]);
        } catch (error) {
            console.error('[AuthRepository] findById error:', error);
            return null;
        }
    }

    /**
     * Create a new user
     * Time Complexity: O(1) for insert
     */
    async create(data: {
        identifier: string;
        type: 'EMAIL' | 'PHONE';
        passwordHash: string;
        otpCode: string;
        otpExpiresAt: Date;
    }): Promise<Result<User, Error>> {
        try {
            const column = data.type === 'EMAIL' ? 'email' : 'phone';

            const query = `
        INSERT INTO users (${column}, password_hash, otp_code, otp_expires_at)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

            const result = await db.query(query, [
                data.identifier,
                data.passwordHash,
                data.otpCode,
                data.otpExpiresAt
            ]);

            return Result.ok(User.fromPersistence(result.rows[0]));
        } catch (error) {
            console.error('[AuthRepository] create error:', error);
            return Result.fail(new DatabaseError('Failed to create user'));
        }
    }

    /**
     * Update user OTP (for resending or registration retry)
     * Time Complexity: O(1) with primary key
     */
    async updateOtp(
        userId: string,
        otpCode: string,
        otpExpiresAt: Date,
        passwordHash?: string
    ): Promise<Result<User, Error>> {
        try {
            let query: string;
            let values: unknown[];

            if (passwordHash) {
                query = `
          UPDATE users 
          SET password_hash = $1, otp_code = $2, otp_expires_at = $3 
          WHERE user_id = $4
          RETURNING *
        `;
                values = [passwordHash, otpCode, otpExpiresAt, userId];
            } else {
                query = `
          UPDATE users 
          SET otp_code = $1, otp_expires_at = $2 
          WHERE user_id = $3
          RETURNING *
        `;
                values = [otpCode, otpExpiresAt, userId];
            }

            const result = await db.query(query, values);

            if (result.rows.length === 0) {
                return Result.fail(new DatabaseError('User not found'));
            }

            return Result.ok(User.fromPersistence(result.rows[0]));
        } catch (error) {
            console.error('[AuthRepository] updateOtp error:', error);
            return Result.fail(new DatabaseError('Failed to update OTP'));
        }
    }

    /**
     * Mark user as verified
     * Time Complexity: O(1) with primary key
     */
    async verify(userId: string, type: 'EMAIL' | 'PHONE'): Promise<Result<User, Error>> {
        try {
            const column = type === 'EMAIL' ? 'is_email_verified' : 'is_phone_verified';

            const query = `
        UPDATE users 
        SET ${column} = TRUE, otp_code = NULL, otp_expires_at = NULL 
        WHERE user_id = $1
        RETURNING *
      `;

            const result = await db.query(query, [userId]);

            if (result.rows.length === 0) {
                return Result.fail(new DatabaseError('User not found'));
            }

            return Result.ok(User.fromPersistence(result.rows[0]));
        } catch (error) {
            console.error('[AuthRepository] verify error:', error);
            return Result.fail(new DatabaseError('Failed to verify user'));
        }
    }

    /**
     * Update password
     * Time Complexity: O(1) with primary key
     */
    async updatePassword(userId: string, passwordHash: string): Promise<Result<User, Error>> {
        try {
            const query = `
        UPDATE users 
        SET password_hash = $1 
        WHERE user_id = $2
        RETURNING *
      `;

            const result = await db.query(query, [passwordHash, userId]);

            if (result.rows.length === 0) {
                return Result.fail(new DatabaseError('User not found'));
            }

            return Result.ok(User.fromPersistence(result.rows[0]));
        } catch (error) {
            console.error('[AuthRepository] updatePassword error:', error);
            return Result.fail(new DatabaseError('Failed to update password'));
        }
    }
}
