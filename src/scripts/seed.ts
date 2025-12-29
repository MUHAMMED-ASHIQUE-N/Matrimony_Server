
import pool from '../config/db';
import bcrypt from 'bcrypt';

const dummyData = [
  {
    email: 'rohit.sharma@example.com',
    password: 'password123',
    profile: {
      first_name: 'Rohit', last_name: 'Sharma', contact: '+919876543210', gender: 'Male', date_of_birth: '1995-05-20',
      profile_created_for: 'Self',
      height_cm: 175, weight_kg: 70, caste: 'Brahmin', marital_status: 'Never Married',
      education: 'B.Tech CS', present_country: 'India', financial_status: 'Middle Class',
      smoking: 'No', drinking: 'Occasionally', diet_preference: 'Veg',
      photos: [], hobbies: ['Cricket', 'Travel'], interests: ['Tech', 'Music'],
      partner_min_age: 22, partner_max_age: 28, partner_min_height: 150, partner_max_height: 170
    }
  },
  {
    email: 'priya.verma@example.com',
    password: 'password123',
    profile: {
      first_name: 'Priya', last_name: 'Verma', contact: '+919876543211', gender: 'Female', date_of_birth: '1998-08-15',
      profile_created_for: 'Self',
      height_cm: 165, weight_kg: 55, caste: 'Brahmin', marital_status: 'Never Married',
      education: 'MBA', present_country: 'India', financial_status: 'Upper Middle Class',
      smoking: 'No', drinking: 'No', diet_preference: 'Veg',
      photos: [], hobbies: ['Reading', 'Cooking'], interests: ['Art', 'History'],
      partner_min_age: 25, partner_max_age: 32, partner_min_height: 170, partner_max_height: 185
    }
  }
];

const seed = async () => {
  try {
    console.log('🌱 Seeding database...');

    // Hash password once to reuse
    const hash = await bcrypt.hash('password123', 10);

    for (const data of dummyData) {
      // 1. Create User
      const userRes = await pool.query(
        `INSERT INTO users (email, password_hash, is_email_verified) VALUES ($1, $2, TRUE) 
         ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING user_id`,
        [data.email, hash]
      );

      const userId = userRes.rows[0].user_id;
      const p = data.profile;

      // 2. Create Profile
      const profileCheck = await pool.query('SELECT profile_id FROM profiles WHERE user_id = $1', [userId]);
      if (profileCheck.rows.length > 0) {
        console.log(`Skipping profile for ${p.first_name} (already exists)`);
        continue;
      }

      await pool.query(
        `INSERT INTO profiles (
          user_id, first_name, last_name, contact, gender, date_of_birth, profile_created_for,
          height_cm, weight_kg, caste, marital_status, education,
          present_country, financial_status, smoking, drinking, diet_preference,
          photos, hobbies, interests,
          partner_min_age, partner_max_age, partner_min_height, partner_max_height
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)`,
        [
          userId, p.first_name, p.last_name, p.contact, p.gender, p.date_of_birth, p.profile_created_for,
          p.height_cm, p.weight_kg, p.caste, p.marital_status, p.education,
          p.present_country, p.financial_status, p.smoking, p.drinking, p.diet_preference,
          p.photos, p.hobbies, p.interests,
          p.partner_min_age, p.partner_max_age, p.partner_min_height, p.partner_max_height
        ]
      );

      console.log(`✅ Created profile for ${p.first_name}`);
    }

    console.log('🎉 Seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

seed();