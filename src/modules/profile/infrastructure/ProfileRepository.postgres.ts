import db from '../../../config/db';
import {
    Result,
    DatabaseError,
    CursorPaginatedResult,
    encodeCursor,
    decodeCursor
} from '../../../shared';
import { Profile } from '../domain/entities/Profile.entity';
import {
    IProfileRepository,
    MatchCriteria,
    ProfileCursor,
    CreateProfileDTO
} from '../application/interfaces';

/**
 * PostgreSQL Profile Repository Implementation
 * 
 * @description Implements IProfileRepository with cursor-based pagination.
 * Uses parameterized queries for SQL injection prevention.
 * 
 * Key Optimizations:
 * - Cursor pagination O(1) vs Offset O(N)
 * - Composite index on (created_at DESC, profile_id DESC)
 */
export class ProfileRepositoryPostgres implements IProfileRepository {

    /**
     * Find profile by user ID
     * Time Complexity: O(1) with index
     */
    async findByUserId(userId: string): Promise<Profile | null> {
        try {
            const result = await db.query(
                'SELECT * FROM profiles WHERE user_id = $1',
                [userId]
            );

            if (result.rows.length === 0) return null;
            return Profile.fromPersistence(result.rows[0]);
        } catch (error) {
            console.error('[ProfileRepository] findByUserId error:', error);
            return null;
        }
    }

    /**
     * Find profile by profile ID
     * Time Complexity: O(1) primary key
     */
    async findByProfileId(profileId: string): Promise<Profile | null> {
        try {
            const result = await db.query(
                'SELECT * FROM profiles WHERE profile_id = $1',
                [profileId]
            );

            if (result.rows.length === 0) return null;
            return Profile.fromPersistence(result.rows[0]);
        } catch (error) {
            console.error('[ProfileRepository] findByProfileId error:', error);
            return null;
        }
    }

    /**
     * Create basic profile
     */
    async createBasic(userId: string, data: {
        firstName: string;
        lastName?: string;
        gender: 'Male' | 'Female' | 'Other';
        profileCreatedFor: string;
    }): Promise<Result<Profile, Error>> {
        try {
            const sql = `
        INSERT INTO profiles (user_id, first_name, last_name, gender, profile_created_for)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

            const result = await db.query(sql, [
                userId,
                data.firstName,
                data.lastName || '',
                data.gender,
                data.profileCreatedFor
            ]);

            return Result.ok(Profile.fromPersistence(result.rows[0]));
        } catch (error) {
            console.error('[ProfileRepository] createBasic error:', error);
            return Result.fail(new DatabaseError('Failed to create profile'));
        }
    }

    /**
     * Upsert full profile (insert or update)
     */
    async upsertFullProfile(userId: string, data: CreateProfileDTO): Promise<Result<Profile, Error>> {
        try {
            const sql = `
        INSERT INTO profiles (
          user_id, first_name, last_name, contact, gender, profile_created_for,
          date_of_birth, height_cm, weight_kg, caste, marital_status,
          education, present_country, financial_status,
          tagline, religion, mother_tongue, college, passout_year,
          occupation, company, annual_income, about_me,
          photos, user_profile, hobbies, interests,
          diet_preference, smoking, drinking,
          partner_min_age, partner_max_age,
          partner_min_height, partner_max_height,
          partner_marital_preference, partner_religion_preference,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23,
          $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36,
          NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          contact = EXCLUDED.contact,
          date_of_birth = EXCLUDED.date_of_birth,
          height_cm = EXCLUDED.height_cm,
          weight_kg = EXCLUDED.weight_kg,
          caste = EXCLUDED.caste,
          marital_status = EXCLUDED.marital_status,
          education = EXCLUDED.education,
          present_country = EXCLUDED.present_country,
          financial_status = EXCLUDED.financial_status,
          tagline = EXCLUDED.tagline,
          religion = EXCLUDED.religion,
          mother_tongue = EXCLUDED.mother_tongue,
          college = EXCLUDED.college,
          passout_year = EXCLUDED.passout_year,
          occupation = EXCLUDED.occupation,
          company = EXCLUDED.company,
          annual_income = EXCLUDED.annual_income,
          about_me = EXCLUDED.about_me,
          photos = EXCLUDED.photos,
          user_profile = EXCLUDED.user_profile,
          hobbies = EXCLUDED.hobbies,
          interests = EXCLUDED.interests,
          diet_preference = EXCLUDED.diet_preference,
          smoking = EXCLUDED.smoking,
          drinking = EXCLUDED.drinking,
          partner_min_age = EXCLUDED.partner_min_age,
          partner_max_age = EXCLUDED.partner_max_age,
          partner_min_height = EXCLUDED.partner_min_height,
          partner_max_height = EXCLUDED.partner_max_height,
          partner_marital_preference = EXCLUDED.partner_marital_preference,
          partner_religion_preference = EXCLUDED.partner_religion_preference,
          updated_at = NOW()
        RETURNING *
      `;

            const values = [
                userId,
                data.firstName,
                data.lastName || '',
                data.contact || null,
                data.gender,
                data.profileCreatedFor,
                data.dateOfBirth || null,
                data.height || null,
                data.weight || null,
                data.caste || null,
                data.maritalStatus || null,
                data.education || null,
                data.presentCountry || null,
                data.financialStatus || null,
                data.tagline || null,
                data.religion || null,
                data.motherTongue || null,
                data.college || null,
                data.passoutYear || null,
                data.occupation || null,
                data.company || null,
                data.annualIncome || null,
                data.aboutMe || null,
                data.photos || [],
                data.userProfile || null,
                data.hobbies || [],
                data.interests || [],
                data.dietPreference || null,
                data.smoking || null,
                data.drinking || null,
                data.partnerMinAge || null,
                data.partnerMaxAge || null,
                data.partnerMinHeight || null,
                data.partnerMaxHeight || null,
                data.partnerMaritalPreference || null,
                data.partnerReligionPreference || null
            ];

            const result = await db.query(sql, values);
            return Result.ok(Profile.fromPersistence(result.rows[0]));
        } catch (error) {
            console.error('[ProfileRepository] upsertFullProfile error:', error);
            return Result.fail(new DatabaseError('Failed to save profile'));
        }
    }

    /**
     * Update profile with dynamic fields
     * Time Complexity: O(1)
     */
    async updateProfile(userId: string, updates: Partial<CreateProfileDTO>): Promise<Result<Profile, Error>> {
        try {
            const columnMap: Record<string, string> = {
                firstName: 'first_name',
                lastName: 'last_name',
                profileCreatedFor: 'profile_created_for',
                maritalStatus: 'marital_status',
                dateOfBirth: 'date_of_birth',
                presentCountry: 'present_country',
                financialStatus: 'financial_status',
                dietPreference: 'diet_preference',
                motherTongue: 'mother_tongue',
                passoutYear: 'passout_year',
                annualIncome: 'annual_income',
                aboutMe: 'about_me',
                height: 'height_cm',
                weight: 'weight_kg',
                partnerMinAge: 'partner_min_age',
                partnerMaxAge: 'partner_max_age',
                partnerMinHeight: 'partner_min_height',
                partnerMaxHeight: 'partner_max_height',
                partnerMaritalPreference: 'partner_marital_preference',
                partnerReligionPreference: 'partner_religion_preference',
                userProfile: 'user_profile'
            };

            const setClauses: string[] = [];
            const values: unknown[] = [];
            let idx = 1;

            for (const [key, value] of Object.entries(updates)) {
                const dbCol = columnMap[key] || key;
                setClauses.push(`${dbCol} = $${idx}`);
                values.push(value);
                idx++;
            }

            if (setClauses.length === 0) {
                const profile = await this.findByUserId(userId);
                return profile
                    ? Result.ok(profile)
                    : Result.fail(new DatabaseError('Profile not found'));
            }

            values.push(userId);
            const sql = `
        UPDATE profiles
        SET ${setClauses.join(', ')}, updated_at = NOW()
        WHERE user_id = $${idx}
        RETURNING *
      `;

            const result = await db.query(sql, values);

            if (result.rows.length === 0) {
                return Result.fail(new DatabaseError('Profile not found'));
            }

            return Result.ok(Profile.fromPersistence(result.rows[0]));
        } catch (error) {
            console.error('[ProfileRepository] updateProfile error:', error);
            return Result.fail(new DatabaseError('Failed to update profile'));
        }
    }

    /**
     * Find matches with cursor-based pagination
     * 
     * @algorithm Cursor Pagination
     * Uses keyset pagination with (created_at, profile_id) composite key.
     * O(1) index seek instead of O(N) offset skip.
     * 
     * @requires Index: CREATE INDEX idx_profiles_cursor 
     *           ON profiles (created_at DESC, profile_id DESC)
     */
    async findMatchesCursor(
        userId: string,
        criteria: MatchCriteria,
        cursor: ProfileCursor | null,
        limit: number
    ): Promise<CursorPaginatedResult<Profile>> {
        const { targetGender, minAge, maxAge, search, location, job, religion, maritalStatus } = criteria;

        // Build base query with age filter
        let sql = `
      SELECT 
        profile_id, user_id, first_name, last_name, gender, user_profile,
        date_part('year', age(date_of_birth)) as age,
        height_cm, weight_kg, caste, religion, marital_status,
        education, occupation, company, annual_income, present_country,
        tagline, about_me, hobbies, interests, mother_tongue,
        photos, created_at, updated_at, profile_created_for, contact,
        date_of_birth, college, passout_year, financial_status,
        diet_preference, smoking, drinking,
        partner_min_age, partner_max_age, partner_min_height, partner_max_height,
        partner_marital_preference, partner_religion_preference, partner_distance_preference_km
      FROM profiles
      WHERE gender = $1 AND user_id != $2
      AND (date_of_birth IS NULL OR date_part('year', age(date_of_birth)) BETWEEN $3 AND $4)
    `;

        const values: unknown[] = [targetGender, userId, minAge, maxAge];
        let paramIdx = 5;

        // Cursor condition - O(1) with composite index
        if (cursor) {
            sql += ` AND (created_at, profile_id) < ($${paramIdx}, $${paramIdx + 1})`;
            values.push(cursor.createdAt, cursor.profileId);
            paramIdx += 2;
        }

        // Optional filters
        if (search) {
            sql += ` AND (first_name ILIKE $${paramIdx} OR last_name ILIKE $${paramIdx})`;
            values.push(`%${search}%`);
            paramIdx++;
        }

        if (location) {
            sql += ` AND present_country ILIKE $${paramIdx}`;
            values.push(`%${location}%`);
            paramIdx++;
        }

        if (job) {
            sql += ` AND occupation ILIKE $${paramIdx}`;
            values.push(`%${job}%`);
            paramIdx++;
        }

        if (religion) {
            sql += ` AND religion = $${paramIdx}`;
            values.push(religion);
            paramIdx++;
        }

        if (maritalStatus) {
            sql += ` AND marital_status = $${paramIdx}`;
            values.push(maritalStatus);
            paramIdx++;
        }

        // Order by cursor keys + fetch one extra to detect hasMore
        sql += ` ORDER BY created_at DESC, profile_id DESC LIMIT $${paramIdx}`;
        values.push(limit + 1);

        try {
            const result = await db.query(sql, values);
            const hasMore = result.rows.length > limit;
            const items = hasMore ? result.rows.slice(0, limit) : result.rows;

            const profiles = items.map((row: Record<string, unknown>) => Profile.fromPersistence(row));

            // Generate next cursor from last item
            let nextCursor: string | null = null;
            if (hasMore && profiles.length > 0) {
                const lastProfile = profiles[profiles.length - 1];
                nextCursor = encodeCursor({
                    sortValue: lastProfile.createdAt,
                    id: lastProfile.profileId
                });
            }

            return {
                items: profiles,
                nextCursor,
                hasMore
            };
        } catch (error) {
            console.error('[ProfileRepository] findMatchesCursor error:', error);
            return { items: [], nextCursor: null, hasMore: false };
        }
    }

    /**
     * Get public profile
     */
    async getPublicProfile(targetUserId: string): Promise<Profile | null> {
        return this.findByUserId(targetUserId);
    }

    /**
     * Update media
     */
    async updateMedia(userId: string, media: {
        userProfile?: string;
        photos?: string[];
    }): Promise<Result<{ userProfile: string | null; photos: string[] }, Error>> {
        try {
            const setClauses: string[] = ['updated_at = NOW()'];
            const values: unknown[] = [];
            let paramIdx = 1;

            if (media.userProfile !== undefined) {
                setClauses.push(`user_profile = $${paramIdx}`);
                values.push(media.userProfile);
                paramIdx++;
            }

            if (media.photos !== undefined) {
                setClauses.push(`photos = $${paramIdx}`);
                values.push(media.photos);
                paramIdx++;
            }

            values.push(userId);
            const sql = `
        UPDATE profiles
        SET ${setClauses.join(', ')}
        WHERE user_id = $${paramIdx}
        RETURNING user_profile, photos
      `;

            const result = await db.query(sql, values);

            if (result.rows.length === 0) {
                return Result.fail(new DatabaseError('Profile not found'));
            }

            return Result.ok({
                userProfile: result.rows[0].user_profile,
                photos: result.rows[0].photos || []
            });
        } catch (error) {
            console.error('[ProfileRepository] updateMedia error:', error);
            return Result.fail(new DatabaseError('Failed to update media'));
        }
    }

    /**
     * Delete media
     */
    async deleteMedia(userId: string, type: 'user_profile' | 'photos', photoUrl?: string): Promise<Result<boolean, Error>> {
        try {
            let sql: string;
            const values: unknown[] = [userId];

            if (type === 'user_profile') {
                sql = `UPDATE profiles SET user_profile = NULL, updated_at = NOW() WHERE user_id = $1`;
            } else if (type === 'photos' && photoUrl) {
                sql = `UPDATE profiles SET photos = array_remove(photos, $2), updated_at = NOW() WHERE user_id = $1`;
                values.push(photoUrl);
            } else {
                return Result.fail(new DatabaseError('Invalid delete media request'));
            }

            await db.query(sql, values);
            return Result.ok(true);
        } catch (error) {
            console.error('[ProfileRepository] deleteMedia error:', error);
            return Result.fail(new DatabaseError('Failed to delete media'));
        }
    }
}
