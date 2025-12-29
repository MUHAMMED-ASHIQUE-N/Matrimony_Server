import db from '../config/db';

export class UserRepository {
  
  static async findByEmail(email: string) {
    const res = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return res.rows[0];
  }

  static async findByPhone(phone: string) {
    const res = await db.query('SELECT * FROM users WHERE phone = $1', [phone]);
    return res.rows[0];
  }

  static async createUser(identifier: string, type: 'EMAIL' | 'PHONE', hash: string, otp: string, exp: Date) {
    // Dynamic Column Selection
    const column = type === 'EMAIL' ? 'email' : 'phone';
    
    const query = `
      INSERT INTO users (${column}, password_hash, otp_code, otp_expires_at) 
      VALUES ($1, $2, $3, $4) 
      RETURNING user_id
    `;
    const res = await db.query(query, [identifier, hash, otp, exp]);
    return res.rows[0];
  }
  // Update existing unverified user (The Fix for your bug)
  static async updateUnverifiedUser(userId: string, passwordHash: string, otp: string, expiresAt: Date) {
    const query = `
      UPDATE users 
      SET password_hash = $1, otp_code = $2, otp_expires_at = $3 
      WHERE user_id = $4
      RETURNING user_id, email
    `;
    const result = await db.query(query, [passwordHash, otp, expiresAt, userId]);
    return result.rows[0];
  }

  // Mark user as verified
  static async verifyUser(userId: string) {
    const query = `
      UPDATE users 
      SET is_email_verified = TRUE, otp_code = NULL, otp_expires_at = NULL 
      WHERE user_id = $1
      RETURNING user_id, email
    `;
    const result = await db.query(query, [userId]);
    return result.rows[0];
  }
}