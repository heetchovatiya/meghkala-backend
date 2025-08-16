import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import User from '../models/user.model';

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await User.find({}).select('-password');
  res.json(users);
});