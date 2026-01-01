import { Request, Response, NextFunction } from 'express';
import db from '../config/db';

export class ProfileController {

  /**
   * 1. Create Basic Profile (Step 3: The Popup)
   * Captures just enough info to show matches.
   */
  static async createBasicProfile(req: Request, res: Response, next: NextFunction) {
    const userId = (req as any).user.userId;
    const { firstName, lastName, gender, profileCreatedFor } = req.body;

    try {
      // Basic Insert
      // Note: Ensure your DB allows NULLs for other fields like height/education
      const sql = `
        INSERT INTO profiles (user_id, first_name, last_name, gender, profile_created_for)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING profile_id, first_name, gender, profile_created_for;
      `;

      const result = await db.query(sql, [userId, firstName, lastName, gender, profileCreatedFor]);

      res.status(201).json({
        message: 'Basic profile created',
        profile: result.rows[0]
      });

    } catch (error) {
      if ((error as any).code === '23505') {
        return res.status(400).json({ message: 'Profile already exists' });
      }
      next(error);
    }
  }

  /**
   * 2. Get Matches (Step 4: Teaser)
   */
  static async getMatches(req: Request, res: Response, next: NextFunction) {
    const userId = (req as any).user.userId;

    try {
      // Fetch My Profile
      const myProfileRes = await db.query(
        `SELECT gender, partner_min_age, partner_max_age, partner_min_height, partner_max_height
         FROM profiles WHERE user_id = $1`,
        [userId]
      );

      if (myProfileRes.rows.length === 0) {
        return res.status(404).json({ message: 'Please create a basic profile first.' });
      }

      const myData = myProfileRes.rows[0];

      // Defaults for Teaser Mode
      const targetGender = myData.gender === 'Male' ? 'Female' : 'Male';
      const minAge = myData.partner_min_age || 18;
      const maxAge = myData.partner_max_age || 60;
      const minHeight = myData.partner_min_height || 0;
      const maxHeight = myData.partner_max_height || 300;

      const matchSql = `
        SELECT 
            profile_id, user_id, first_name, last_name, 
            date_part('year', age(date_of_birth)) as age, 
            height_cm, photos, education, present_country, 
            marital_status, financial_status
        FROM profiles
        WHERE 
            gender = $1
            AND (date_of_birth IS NULL OR date_part('year', age(date_of_birth)) BETWEEN $2 AND $3)
            AND (height_cm IS NULL OR height_cm BETWEEN $4 AND $5)
            AND user_id != $6
        ORDER BY created_at DESC
        LIMIT 10;
      `;

      const matches = await db.query(matchSql, [
        targetGender, minAge, maxAge, minHeight, maxHeight, userId
      ]);

      res.json({ 
        isTeaser: !myData.partner_min_age,
        count: matches.rows.length,
        matches: matches.rows 
      });

    } catch (error) {
      next(error);
    }
  }
static async registerFullProfile(req: Request, res: Response, next: NextFunction) {
    const userId = (req as any).user.userId;
    const data = req.body;

    try {
      // 1. Parse Ranges (Frontend sends [25, 30], DB needs min_age, max_age)
      const [pMinAge, pMaxAge] = data.ageRange || [18, 60];
      const [pMinHeight, pMaxHeight] = data.heightRange || [140, 200];

      // 2. Prepare SQL (Upsert: Update if exists, Insert if not)
      const query = `
        INSERT INTO profiles (
          user_id, first_name, last_name, contact, gender, profile_created_for,
          date_of_birth, height_cm, weight_kg, caste, marital_status,
          education, present_country, financial_status,
          photos, hobbies, interests,
          diet_preference, smoking, drinking,
          partner_min_age, partner_max_age,
          partner_min_height, partner_max_height,
          partner_marital_preference, partner_religion_preference,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, 
          $7, $8, $9, $10, $11, 
          $12, $13, $14, 
          $15, $16, $17, 
          $18, $19, $20, 
          $21, $22, $23, $24, $25, $26,
          NOW()
        )
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          contact = EXCLUDED.contact,
          photos = EXCLUDED.photos,
          education = EXCLUDED.education,
          present_country = EXCLUDED.present_country,
          financial_status = EXCLUDED.financial_status,
          partner_min_age = EXCLUDED.partner_min_age,
          partner_max_age = EXCLUDED.partner_max_age,
          updated_at = NOW()
        RETURNING *;
      `;

      const values = [
        userId, 
        data.firstName, data.lastName, data.contact, data.gender, data.profileCreatedFor,
        data.dateOfBirth, parseFloat(data.height), parseFloat(data.weight), data.caste, data.maritalStatus,
        data.education, data.presentCountry, data.financialStatus,
        data.photos || [], data.hobbies || [], data.interests || [],
        data.dietPreference, data.smoking, data.drinking,
        pMinAge, pMaxAge,
        pMinHeight, pMaxHeight,
        data.maritalStatusPreference, data.religionPreference
      ];

      const result = await db.query(query, values);

      res.status(200).json({
        message: 'Full profile registered successfully',
        profile: result.rows[0]
      });

    } catch (error) {
      next(error);
    }
  }
  /**
   * 3. Update Full Profile (Step 5: Full Registration)
   * Uses dynamic update to fill in the rest of the details.
   */
  static async updateMe(req: Request, res: Response, next: NextFunction) {
    const userId = (req as any).user.userId;
    const updates = req.body;

    // Remove immutable fields
    delete updates.user_id;
    delete updates.profile_id;
    delete updates.created_at;

    // Mapping for camelCase -> snake_case
    const columnMap: Record<string, string> = {
        firstName: 'first_name',
        lastName: 'last_name',
        maritalStatus: 'marital_status',
        dateOfBirth: 'date_of_birth',
        presentCountry: 'present_country',
        financialStatus: 'financial_status',
        dietPreference: 'diet_preference',
        // Partner Preferences
        partnerMinAge: 'partner_min_age',
        partnerMaxAge: 'partner_max_age',
        partnerMinHeight: 'partner_min_height',
        partnerMaxHeight: 'partner_max_height',
        partnerMaritalPreference: 'partner_marital_preference'
    };

    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
        const dbCol = columnMap[key] || key; // Fallback to key
        setClauses.push(`${dbCol} = $${idx}`);
        values.push(value);
        idx++;
    }

    if (setClauses.length === 0) return res.status(400).json({message: "No fields to update"});
    
    values.push(userId);

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
  
  static async getMe(req: Request, res: Response, next: NextFunction) {
      const userId = (req as any).user.userId;
      try {
        const result = await db.query('SELECT * FROM profiles WHERE user_id = $1', [userId]);
        if (result.rows.length === 0) return res.status(404).json({message: "Profile not found"});
        res.json(result.rows[0]);
      } catch (err) { next(err); }
  }
}