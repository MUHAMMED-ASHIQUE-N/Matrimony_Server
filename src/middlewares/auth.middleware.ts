import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, JwtPayload } from '../core/types';

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user payload to request
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  // 1. Check for the Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Access denied. No token provided.'
    });
  }

  // 2. Extract the token (Remove "Bearer " prefix)
  const token = authHeader.split(' ')[1];

  try {
    // 3. Verify the token
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;

    // 4. Attach the user payload (userId) to the request object
    // Using type-safe AuthenticatedRequest instead of 'any'
    (req as AuthenticatedRequest).user = { userId: payload.userId };

    next(); // Pass control to the next handler (the Controller)
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Invalid or expired token.'
    });
  }
};

// Alias for cleaner route definitions
export const protect = authenticate;