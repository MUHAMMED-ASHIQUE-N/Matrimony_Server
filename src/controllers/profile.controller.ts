import { Request, Response, NextFunction } from 'express';
import db from '../config/db';

export class ProfileController {
  static async create(req: Request, res: Response, next: NextFunction) {
    // req.user is populated by the auth middleware
    const userId = (req as any).user.userId; 
    const data = req.body;

    const sql = `
      INSERT INTO profiles (
        user_id, first_name, last_name, contact, gender, date_of_birth,
        height_cm, weight_kg, caste, marital_status, education, 
        present_country, financial_status, smoking, drinking, diet_preference,
        photos, hobbies, interests,
        partner_min_age, partner_max_age, partner_min_height, partner_max_height,
        partner_marital_preference, partner_religion_preference, partner_distance_preference_km
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
      )
      RETURNING *;
    `;

    const values = [
      userId, data.firstName, data.lastName, data.contact, data.gender, data.dateOfBirth,
      data.height, data.weight, data.caste, data.maritalStatus, data.education,
      data.presentCountry, data.financialStatus, data.smoking, data.drinking, data.dietPreference,
      data.photos, data.hobbies, data.interests,
      data.ageRange.min, data.ageRange.max, data.heightRange.min, data.heightRange.max,
      data.maritalStatusPreference, data.religionPreference, data.distance
    ];

    try {
      const result = await db.query(sql, values);
      res.status(201).json({
        message: 'Profile created successfully',
        profile: result.rows[0]
      });
    } catch (error: any) {
      // Handle Unique Constraint (User already has profile)
      if (error.code === '23505') {
        return res.status(400).json({ message: 'Profile already exists for this user' });
      }
      next(error);
    }
  }


  static async getMe(req: Request, res: Response, next: NextFunction) {
    const userId = (req as any).user.userId;

    try {
      const sql = `
        SELECT * FROM profiles 
        WHERE user_id = $1;
      `;
      const result = await db.query(sql, [userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Profile not found. Please create one.' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/profile/me
   * Update specific fields of the user's profile
   */
  static async updateMe(req: Request, res: Response, next: NextFunction) {
    const userId = (req as any).user.userId;
    const updates = req.body;

    // Safety: Prevent users from changing their user_id or profile_id
    delete updates.user_id;
    delete updates.profile_id;
    delete updates.created_at;

    // Dynamic SQL Generation (Senior Pattern)
    // This allows updating only 1 field or 20 fields without writing 20 different queries.
    const fields = Object.keys(updates);
    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields provided for update' });
    }

    // Map camelCase keys to snake_case columns
    // NOTE: In production, use a library like 'humps' or a mapper. 
    // For now, assuming you send snake_case or we map manually.
    // Let's assume the frontend sends data matching the DB columns or we map strict keys.
    // Simple manual mapping for safety:
    const columnMap: Record<string, string> = {
        firstName: 'first_name',
        lastName: 'last_name',
        maritalStatus: 'marital_status',
        // ... add other mappings as needed
    };

    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
        const dbCol = columnMap[key] || key; // Fallback to key if no map found
        setClauses.push(`${dbCol} = $${idx}`);
        values.push(value);
        idx++;
    }
    
    values.push(userId); // The WHERE clause parameter

    const sql = `
      UPDATE profiles 
      SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $${idx}
      RETURNING *;
    `;

    try {
      const result = await db.query(sql, values);
      res.json({ message: 'Profile updated', profile: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/profile/matches
   * The "Magic" Algorithm: Find people based on MY preferences
   */
/**
   * GET /api/profile/matches
   * The "Magic" Algorithm: Find people based on MY preferences
   */
  static async getMatches(req: Request, res: Response, next: NextFunction) {
    const userId = (req as any).user.userId;

    try {
      // 1. Fetch My Preferences First
      const myProfileRes = await db.query(
        `SELECT 
            gender, 
            partner_min_age, partner_max_age,
            partner_min_height, partner_max_height,
            partner_marital_preference, partner_religion_preference,
            partner_distance_preference_km
         FROM profiles WHERE user_id = $1`,
        [userId]
      );

      if (myProfileRes.rows.length === 0) {
        return res.status(400).json({ message: 'Create your profile to see matches' });
      }

      const myPrefs = myProfileRes.rows[0];

      // 2. Determine "Opposite" Gender Logic
      const targetGender = myPrefs.gender === 'Male' ? 'Female' : 'Male';

      // 3. The Matching Query (FIXED)
      const matchSql = `
        SELECT 
            profile_id, 
            user_id, 
            first_name, 
            last_name, 
            
            -- FIX 1: Calculate Age dynamically (DB has DOB, not Age)
            date_part('year', age(date_of_birth)) as age, 
            
            height_cm, 
            photos, 
            education, 
            
            -- FIX 2: Use columns that actually exist in your schema
            present_country, 
            marital_status,
            financial_status
            
        FROM profiles
        WHERE 
            -- Gender Match
            gender = $1
            
            -- Age Match (Calculated dynamically)
            AND date_part('year', age(date_of_birth)) BETWEEN $2 AND $3
            
            -- Height Match
            AND height_cm BETWEEN $4 AND $5
            
            -- Marital Status (Optional Filter)
            AND ($6 = 'Any' OR marital_status = $6)
            
            -- Exclude Myself
            AND user_id != $7
            
        ORDER BY created_at DESC
        LIMIT 20; 
      `;

      const matches = await db.query(matchSql, [
        targetGender,
        myPrefs.partner_min_age || 18,    
        myPrefs.partner_max_age || 60,    
        myPrefs.partner_min_height || 0,
        myPrefs.partner_max_height || 300,
        myPrefs.partner_marital_preference || 'Any',
        userId
      ]);

      res.json({ 
        count: matches.rows.length,
        matches: matches.rows 
      });

    } catch (error) {
      next(error);
    }
  }
}