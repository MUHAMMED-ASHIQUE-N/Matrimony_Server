import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  // 1. Check for the Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
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

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Attach the user payload (userId) to the request object
    // This allows Controllers to access (req as any).user.userId
    (req as any).user = payload;

    next(); // Pass control to the next handler (the Controller)
  } catch (err) {
    return res.status(403).json({ 
      message: 'Forbidden: Invalid or expired token.' 
    });
  }
};