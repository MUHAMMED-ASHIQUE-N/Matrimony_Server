
import pool from '../config/db';

const initDb = async () => {
  const client = await pool.connect();
  try {
    console.log('🚀 Initializing Database...');

    await client.query('BEGIN');

    // 1. Users Table
    // "user_id", "email", "password_hash", "created_at", "otp_code", "otp_expires_at"
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255), -- Nullable initially (until setPassword)
        otp_code VARCHAR(10),
        otp_expires_at TIMESTAMP,
        is_email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Users table created');

    // 2. Profiles Table
    // Matches user request exactly
    await client.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
        
        -- Basic Info
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        contact VARCHAR(50), 
        gender VARCHAR(20),
        date_of_birth DATE,
        profile_created_for VARCHAR(50),
        
        -- Physical & Personal attributes
        height_cm INTEGER,
        weight_kg INTEGER,
        caste VARCHAR(100),
        marital_status VARCHAR(50),
        education VARCHAR(255),
        present_country VARCHAR(100),
        financial_status VARCHAR(100),
        
        -- Lifestyle
        smoking VARCHAR(20),
        drinking VARCHAR(20),
        diet_preference VARCHAR(50),
        
        -- Media & Interests
        photos TEXT[], -- Array of URLs
        hobbies TEXT[],
        interests TEXT[],
        
        -- Partner Preferences
        partner_min_age INTEGER,
        partner_max_age INTEGER,
        partner_min_height INTEGER,
        partner_max_height INTEGER,
        partner_marital_preference VARCHAR(100),
        partner_religion_preference VARCHAR(100),
        partner_distance_preference_km INTEGER,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Profiles table created');

    await client.query('COMMIT');
    console.log('🎉 Database initialization successful!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database initialization failed:', error);
  } finally {
    client.release();
    process.exit();
  }
};

initDb();
