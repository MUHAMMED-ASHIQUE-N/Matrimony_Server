import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt'; // or argon2
import jwt from 'jsonwebtoken';
import db from '../config/db'; // Your pg pool

export class AuthController {
  
  static async signup(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      // 1. Check if user exists
      const userCheck = await db.query('SELECT user_id FROM users WHERE email = $1', [email]);
      if (userCheck.rows.length > 0) {
        return res.status(409).json({ message: 'Email already exists' });
      }

      // 2. Hash Password
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

      // 3. Insert User
      const newUser = await db.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING user_id, email',
        [email, hash]
      );

      // 4. Generate Token immediately so they are logged in
      const token = jwt.sign(
        { userId: newUser.rows[0].user_id }, 
        process.env.JWT_SECRET as string, 
        { expiresIn: '7d' }
      );

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: newUser.rows[0]
      });

    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      // 1. Find User
      const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      const user = result.rows[0];

      if (!user) return res.status(401).json({ message: 'Invalid credentials' });

      // 2. Compare Password
      const validPass = await bcrypt.compare(password, user.password_hash);
      if (!validPass) return res.status(401).json({ message: 'Invalid credentials' });

      // 3. Generate Token
      const token = jwt.sign(
        { userId: user.user_id }, 
        process.env.JWT_SECRET as string, 
        { expiresIn: '7d' }
      );

      res.json({ token, userId: user.user_id });

    } catch (error) {
      next(error);
    }
  }
}