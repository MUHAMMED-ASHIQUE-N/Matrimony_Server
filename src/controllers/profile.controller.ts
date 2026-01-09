import { Request, Response, NextFunction } from 'express';
import db from '../config/db';
import { StorageService } from '../services/storage.service';

export class ProfileController {

  // ... (Keep createBasicProfile, registerFullProfile, uploadMedia, deleteMedia, updateMe) ...
  // I am including them briefly to ensure the file is valid, but the main change is getMatches at the bottom.

  static async createBasicProfile(req: Request, res: Response, next: NextFunction) {
    const userId = (req as any).user.userId;
    const { firstName, lastName, gender, profileCreatedFor } = req.body;
    try {
      const sql = `
        INSERT INTO profiles (user_id, first_name, last_name, gender, profile_created_for)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING profile_id, first_name, gender, profile_created_for;
      `;
      const result = await db.query(sql, [userId, firstName, lastName, gender, profileCreatedFor]);
      res.status(201).json({ message: 'Basic profile created', profile: result.rows[0] });
    } catch (error) {
      if ((error as any).code === '23505') return res.status(400).json({ message: 'Profile already exists' });
      next(error);
    }
  }

 static async registerFullProfile(req: Request, res: Response, next: NextFunction) {
     const userId = (req as any).user.userId;
     const data = req.body;
     const files = req.files as { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[] | undefined;
 
     try {
       // ... (Keep existing image upload logic) ...
       let photoUrls: string[] = [];
       let userProfileUrl: string | null = null;
 
       if (files && !Array.isArray(files)) {
         if (files['user_profile']?.[0]) userProfileUrl = await StorageService.uploadImage(files['user_profile'][0].buffer);
         if (files['photos'] && files['photos'].length > 0) photoUrls = await StorageService.uploadMultipleImages(files['photos']);
       } else if (Array.isArray(files) && files.length > 0) {
         photoUrls = await StorageService.uploadMultipleImages(files);
       } else if (data.photos) {
          photoUrls = Array.isArray(data.photos) ? data.photos : [data.photos];
       }
       if (data.user_profile) userProfileUrl = data.user_profile;
 
       // ... (Keep existing parsing logic) ...
       const parseRange = (val: any) => {
          if (!val) return null;
          if (typeof val === 'string') { try { return JSON.parse(val); } catch { return val.split(',').map(Number); } }
          return val;
       };
       const [pMinAge, pMaxAge] = parseRange(data.ageRange) || [18, 60];
       const [pMinHeight, pMaxHeight] = parseRange(data.heightRange) || [140, 200];
       const hobbies = typeof data.hobbies === 'string' ? [data.hobbies] : data.hobbies;
       const interests = typeof data.interests === 'string' ? [data.interests] : data.interests;
 
       // Parse Passout Year safely
       const passoutYear = data.passoutYear ? parseInt(data.passoutYear.toString()) : null;

       const query = `
         INSERT INTO profiles (
           user_id, first_name, last_name, contact, gender, profile_created_for,
           date_of_birth, height_cm, weight_kg, caste, marital_status,
           education, present_country, financial_status,
           
           -- NEW COLUMNS
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
           $1, $2, $3, $4, $5, $6, 
           $7, $8, $9, $10, $11, 
           $12, $13, $14, 
           $15, $16, $17, $18, $19, $20, $21, $22, $23,
           $24, $25, $26, $27, 
           $28, $29, $30, 
           $31, $32, $33, $34, $35, $36, 
           NOW()
         )
         ON CONFLICT (user_id) DO UPDATE SET 
           first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, contact = EXCLUDED.contact,
           photos = EXCLUDED.photos, user_profile = EXCLUDED.user_profile, education = EXCLUDED.education,
           present_country = EXCLUDED.present_country, financial_status = EXCLUDED.financial_status,
           
           -- UPDATE NEW COLUMNS
           tagline = EXCLUDED.tagline, religion = EXCLUDED.religion, mother_tongue = EXCLUDED.mother_tongue,
           college = EXCLUDED.college, passout_year = EXCLUDED.passout_year, occupation = EXCLUDED.occupation,
           company = EXCLUDED.company, annual_income = EXCLUDED.annual_income, about_me = EXCLUDED.about_me,

           partner_min_age = EXCLUDED.partner_min_age, partner_max_age = EXCLUDED.partner_max_age, updated_at = NOW()
         RETURNING *;
       `;
 
       const values = [
         userId, data.firstName, data.lastName, data.contact, data.gender, data.profileCreatedFor,
         data.dateOfBirth, parseFloat(data.height), parseFloat(data.weight), data.caste, data.maritalStatus,
         data.education, data.presentCountry, data.financialStatus,
         
         // New Values
         data.tagline, data.religion, data.motherTongue, data.college, passoutYear, 
         data.occupation, data.company, data.annualIncome, data.aboutMe,

         photoUrls, userProfileUrl, hobbies || [], interests || [],
         data.dietPreference, data.smoking, data.drinking,
         pMinAge, pMaxAge, pMinHeight, pMaxHeight,
         data.maritalStatusPreference, data.religionPreference
       ];
 
       const result = await db.query(query, values);
       res.status(200).json({ message: 'Full profile registered successfully', profile: result.rows[0] });
     } catch (error) { next(error); }
  }

  static async uploadMedia(req: Request, res: Response, next: NextFunction) {
      const userId = (req as any).user.userId;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      try {
          let updateQuery = 'UPDATE profiles SET updated_at = NOW()';
          const values: any[] = [];
          let paramIdx = 1;
          if (files['user_profile']?.[0]) {
              const url = await StorageService.uploadImage(files['user_profile'][0].buffer);
              updateQuery += `, user_profile = $${paramIdx}`;
              values.push(url);
              paramIdx++;
          }
          if (files['photos'] && files['photos'].length > 0) {
              const urls = await StorageService.uploadMultipleImages(files['photos']);
              updateQuery += `, photos = $${paramIdx}`;
              values.push(urls);
              paramIdx++;
          }
          if (values.length === 0) return res.status(400).json({ message: "No files uploaded" });
          updateQuery += ` WHERE user_id = $${paramIdx} RETURNING user_profile, photos`;
          values.push(userId);
          const result = await db.query(updateQuery, values);
          if (result.rows.length === 0) return res.status(404).json({ message: "Profile not found" });
          res.json({ message: 'Media updated successfully', media: result.rows[0] });
      } catch (error) { next(error); }
  }

  static async deleteMedia(req: Request, res: Response, next: NextFunction) {
      const userId = (req as any).user.userId;
      const { type, url } = req.body;
      if (!['user_profile', 'photos'].includes(type)) return res.status(400).json({ message: "Invalid media type" });
      try {
          let sql = '';
          const values = [userId];
          if (type === 'user_profile') {
              sql = `UPDATE profiles SET user_profile = NULL, updated_at = NOW() WHERE user_id = $1 RETURNING user_profile, photos`;
          } else if (type === 'photos') {
              if (!url) return res.status(400).json({ message: "URL is required" });
              sql = `UPDATE profiles SET photos = array_remove(photos, $2), updated_at = NOW() WHERE user_id = $1 RETURNING user_profile, photos`;
              values.push(url);
          }
          const result = await db.query(sql, values);
          if (result.rows.length === 0) return res.status(404).json({ message: "Profile not found" });
          res.json({ message: "Media deleted successfully", media: result.rows[0] });
      } catch (error) { next(error); }
  }

 static async updateMe(req: Request, res: Response, next: NextFunction) {
      const userId = (req as any).user.userId;
      const updates = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[] | undefined;
      
      // ... (Keep existing file handling and range parsing logic) ...
      if (files && !Array.isArray(files)) {
          if (files['user_profile']?.[0]) updates.user_profile = await StorageService.uploadImage(files['user_profile'][0].buffer);
          if (files['photos'] && files['photos'].length > 0) updates.photos = await StorageService.uploadMultipleImages(files['photos']);
      }
      if (updates.ageRange) { const r = typeof updates.ageRange === 'string' ? JSON.parse(updates.ageRange) : updates.ageRange; updates.partner_min_age = r[0]; updates.partner_max_age = r[1]; delete updates.ageRange; }
      if (updates.heightRange) { const r = typeof updates.heightRange === 'string' ? JSON.parse(updates.heightRange) : updates.heightRange; updates.partner_min_height = r[0]; updates.partner_max_height = r[1]; delete updates.heightRange; }
      if (updates.height) updates.height_cm = parseFloat(updates.height);
      if (updates.weight) updates.weight_kg = parseFloat(updates.weight);
      
      const forbidden = ['user_id', 'profile_id', 'created_at', 'height', 'weight'];
      forbidden.forEach(f => delete updates[f]);

      // MAPPING UPDATE
      const columnMap: Record<string, string> = { 
          firstName: 'first_name', lastName: 'last_name', profileCreatedFor: 'profile_created_for', 
          maritalStatus: 'marital_status', dateOfBirth: 'date_of_birth', presentCountry: 'present_country', 
          financialStatus: 'financial_status', dietPreference: 'diet_preference', 
          maritalStatusPreference: 'partner_marital_preference', religionPreference: 'partner_religion_preference', 
          userProfile: 'user_profile',
          // New Mappings
          motherTongue: 'mother_tongue',
          passoutYear: 'passout_year',
          annualIncome: 'annual_income',
          aboutMe: 'about_me'
          // tagline, religion, college, occupation, company map directly (same name in DB if using snake_case or handled below)
      };

      const setClauses = [];
      const values = [];
      let idx = 1;
      
      for (const [key, value] of Object.entries(updates)) { 
          // If key is not in map, assume key IS the db column (e.g. occupation -> occupation)
          const dbCol = columnMap[key] || key; 
          setClauses.push(`${dbCol} = $${idx}`); 
          values.push(value); 
          idx++; 
      }

      if (setClauses.length === 0) return res.status(400).json({message: "No fields to update"});
      
      values.push(userId);
      const sql = `UPDATE profiles SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = $${idx} RETURNING *;`;
      
      try { 
          const result = await db.query(sql, values); 
          if (result.rows.length === 0) return res.status(404).json({message: "Profile not found"}); 
          res.json({ message: 'Profile updated', profile: result.rows[0] }); 
      } catch (error) { next(error); }
  }

  static async getMe(req: Request, res: Response, next: NextFunction) {
       const userId = (req as any).user.userId;
       try {
         const result = await db.query('SELECT * FROM profiles WHERE user_id = $1', [userId]);
         if (result.rows.length === 0) return res.status(404).json({message: "Profile not found"});
         res.json(result.rows[0]);
       } catch (err) { next(err); }
  }

  /**
   * GET MATCHES & FILTER & SEARCH
   * Flow:
   * 1. Get My Profile -> Check Gender & Saved Preferences
   * 2. Apply Filters: Query Params (Search) >> Saved Preferences (Full Profile) >> Defaults (Basic Profile)
   */
static async getMatches(req: Request, res: Response, next: NextFunction) {
     const userId = (req as any).user.userId;
     const { search, location, job, ageMin, ageMax } = req.query;
     try {
       const myProfileRes = await db.query(`SELECT gender, partner_min_age, partner_max_age, partner_min_height, partner_max_height, partner_religion_preference FROM profiles WHERE user_id = $1`, [userId]);
       if (myProfileRes.rows.length === 0) return res.status(404).json({ message: 'Please create a basic profile first.' });
       const myData = myProfileRes.rows[0];
       const targetGender = myData.gender === 'Male' ? 'Female' : 'Male';
       const targetMinAge = ageMin || myData.partner_min_age || 18;
       const targetMaxAge = ageMax || myData.partner_max_age || 60;
       
       // UPDATED SELECT QUERY TO INCLUDE NEW FIELDS FOR CARD DISPLAY
       let sql = `
         SELECT 
            profile_id, user_id, first_name, last_name, gender, user_profile, 
            date_part('year', age(date_of_birth)) as age, 
            height_cm, weight_kg, caste, religion, marital_status,
            education, occupation, company, annual_income, present_country, 
            tagline, about_me, hobbies, interests, mother_tongue
         FROM profiles 
         WHERE gender = $1 AND user_id != $2 
         AND (date_of_birth IS NULL OR date_part('year', age(date_of_birth)) BETWEEN $3 AND $4)`;
         
       const values: any[] = [targetGender, userId, targetMinAge, targetMaxAge];
       let paramIdx = 5;
       if (search) { sql += ` AND (first_name ILIKE $${paramIdx} OR last_name ILIKE $${paramIdx})`; values.push(`%${search}%`); paramIdx++; }
       if (location) { sql += ` AND present_country ILIKE $${paramIdx}`; values.push(`%${location}%`); paramIdx++; }
       
       // Map 'job' filter to 'occupation' column
       if (job) { sql += ` AND occupation ILIKE $${paramIdx}`; values.push(`%${job}%`); paramIdx++; }
       
       sql += ` ORDER BY created_at DESC LIMIT 50`;
       const matches = await db.query(sql, values);
       res.json({ criteria: { lookingFor: targetGender, ageRange: [targetMinAge, targetMaxAge], filters: { search, location, job } }, count: matches.rows.length, matches: matches.rows });
     } catch (error) { next(error); }
   }

 static async getUserProfile(req: Request, res: Response, next: NextFunction) {
    const targetUserId = req.params.id;
    try {
      // UPDATED SELECT QUERY TO INCLUDE NEW FIELDS
      const query = `
        SELECT 
            profile_id, user_id, first_name, last_name, gender, date_of_birth, 
            height_cm, weight_kg, caste, religion, mother_tongue, marital_status, 
            education, college, passout_year, occupation, company, annual_income,
            present_country, financial_status, photos, user_profile, 
            tagline, about_me, hobbies, interests, diet_preference, smoking, drinking, 
            partner_min_age, partner_max_age, partner_min_height, partner_max_height, partner_religion_preference 
        FROM profiles WHERE user_id = $1`;
        
      const result = await db.query(query, [targetUserId]);
      if (result.rows.length === 0) return res.status(404).json({ message: 'Profile not found' });
      res.json(result.rows[0]);
    } catch (error) { next(error); }
  }
}