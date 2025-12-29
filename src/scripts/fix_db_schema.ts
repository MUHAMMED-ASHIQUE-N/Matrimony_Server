
import pool from '../config/db';

const fixSchema = async () => {
    const client = await pool.connect();
    try {
        console.log('🔧 Fixing Database Schema...');

        await client.query('BEGIN');

        // 1. Fix Users Table
        // Add missing columns if they don't exist
        await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS otp_code VARCHAR(10),
      ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP;
    `);

        // Make password_hash nullable (required for new signup flow)
        await client.query(`
      ALTER TABLE users 
      ALTER COLUMN password_hash DROP NOT NULL;
    `);

        console.log('✅ Users table schema updated.');

        // 2. Fix Profiles Table
        // Add newly added profile columns just in case
        await client.query(`
      ALTER TABLE profiles
      ADD COLUMN IF NOT EXISTS contact VARCHAR(50),
      ADD COLUMN IF NOT EXISTS profile_created_for VARCHAR(50),
      ADD COLUMN IF NOT EXISTS hobbies TEXT[],
      ADD COLUMN IF NOT EXISTS interests TEXT[],
      ADD COLUMN IF NOT EXISTS partner_religion_preference VARCHAR(100),
      ADD COLUMN IF NOT EXISTS partner_distance_preference_km INTEGER;
    `);

        console.log('✅ Profiles table schema updated.');

        await client.query('COMMIT');
        console.log('🎉 Database repair successful!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Database repair failed:', error);
    } finally {
        client.release();
        process.exit();
    }
};

fixSchema();
