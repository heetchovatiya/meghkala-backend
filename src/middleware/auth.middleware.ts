import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User, { IUser } from '../models/user.model';

/**
 * FINAL, CORRECTED AuthRequest Interface.
 * The 'user' property is now OPTIONAL, to match Express's Request type before authentication.
 * After the 'protect' middleware, 'req.user' will be set.
 */
export interface AuthRequest extends Request {
  user?: IUser;
}

// The 'protect' middleware remains logically the same.
export const protect = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
      
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        res.status(401);
        throw new Error('Not authorized, user not found');
      }

      // Assign the found user to req.user. This satisfies the required property.
      req.user = user;
      next();

    } catch (error) {
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

// The 'admin' middleware also benefits from this stronger type.
export const admin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403);
    throw new Error('Not authorized as an admin');
  }
};