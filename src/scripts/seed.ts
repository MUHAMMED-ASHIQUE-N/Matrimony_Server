import pool from '../config/db';
import bcrypt from 'bcrypt';

const dummyData = [
  {
    email: 'rohit.sharma@example.com',
    password: 'password123',
    profile: {
      first_name: 'Rohit', last_name: 'Sharma', gender: 'Male', date_of_birth: '1995-05-20',
      height_cm: 175, weight_kg: 70, caste: 'Brahmin', marital_status: 'Never Married',
      education: 'B.Tech CS', present_country: 'India', financial_status: 'Middle Class',
      smoking: 'No', drinking: 'Occasionally', diet_preference: 'Veg',
      partner_min_age: 22, partner_max_age: 28, partner_min_height: 150, partner_max_height: 170
    }
  },
  {
    email: 'priya.verma@example.com',
    password: 'password123',
    profile: {
      first_name: 'Priya', last_name: 'Verma', gender: 'Female', date_of_birth: '1998-08-15',
      height_cm: 165, weight_kg: 55, caste: 'Brahmin', marital_status: 'Never Married',
      education: 'MBA', present_country: 'India', financial_status: 'Upper Middle Class',
      smoking: 'No', drinking: 'No', diet_preference: 'Veg',
      partner_min_age: 25, partner_max_age: 32, partner_min_height: 170, partner_max_height: 185
    }
  },
  {
    email: 'arjun.reddy@example.com',
    password: 'password123',
    profile: {
      first_name: 'Arjun', last_name: 'Reddy', gender: 'Male', date_of_birth: '1992-12-10',
      height_cm: 180, weight_kg: 85, caste: 'Reddy', marital_status: 'Divorced',
      education: 'MS', present_country: 'USA', financial_status: 'Rich',
      smoking: 'Yes', drinking: 'Yes', diet_preference: 'Non-Veg',
      partner_min_age: 24, partner_max_age: 30, partner_min_height: 160, partner_max_height: 175
    }
  },
  {
    email: 'sneha.patel@example.com',
    password: 'password123',
    profile: {
      first_name: 'Sneha', last_name: 'Patel', gender: 'Female', date_of_birth: '1996-03-25',
      height_cm: 160, weight_kg: 50, caste: 'Patel', marital_status: 'Never Married',
      education: 'MBBS', present_country: 'UK', financial_status: 'Rich',
      smoking: 'No', drinking: 'No', diet_preference: 'Veg',
      partner_min_age: 26, partner_max_age: 34, partner_min_height: 170, partner_max_height: 180
    }
  },
  {
    email: 'rahul.nair@example.com',
    password: 'password123',
    profile: {
      first_name: 'Rahul', last_name: 'Nair', gender: 'Male', date_of_birth: '1990-01-14',
      height_cm: 172, weight_kg: 75, caste: 'Nair', marital_status: 'Never Married',
      education: 'B.Arch', present_country: 'UAE', financial_status: 'Middle Class',
      smoking: 'No', drinking: 'Socially', diet_preference: 'Non-Veg',
      partner_min_age: 23, partner_max_age: 29, partner_min_height: 155, partner_max_height: 168
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
        `INSERT INTO users (email, password_hash) VALUES ($1, $2) 
         ON CONFLICT (email) DO NOTHING RETURNING user_id`,
        [data.email, hash]
      );

      // If user already exists (from previous run), skip
      if (userRes.rows.length === 0) {
        console.log(`Skipping ${data.email} (already exists)`);
        continue;
      }

      const userId = userRes.rows[0].user_id;
      const p = data.profile;

      // 2. Create Profile
      await pool.query(
        `INSERT INTO profiles (
          user_id, first_name, last_name, gender, date_of_birth,
          height_cm, weight_kg, caste, marital_status, education,
          present_country, financial_status, smoking, drinking, diet_preference,
          partner_min_age, partner_max_age, partner_min_height, partner_max_height
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
        [
          userId, p.first_name, p.last_name, p.gender, p.date_of_birth,
          p.height_cm, p.weight_kg, p.caste, p.marital_status, p.education,
          p.present_country, p.financial_status, p.smoking, p.drinking, p.diet_preference,
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