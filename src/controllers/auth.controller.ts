import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import User from '../models/user.model';
import generateToken from '../utils/generateToken';
import { sendEmail } from '../utils/sendEmail';
import { AuthRequest } from '../middleware/auth.middleware';

// Reusable function to format response and send token
const generateAndRespond = (res: Response, user: any) => {
    res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id.toString()),
    });
};

// @desc    Register a new user (Traditional)
// @route   POST /api/auth/register
export const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error('User with this email already exists.');
  }
  const user = await User.create({ name, email, password });
  generateAndRespond(res, user);
});

// @desc    Authenticate user & get token (Traditional)
// @route   POST /api/auth/login
export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await User.findOne({ email })

  if (user) {
    generateAndRespond(res, user);
  } else {
    res.status(401);
    throw new Error('Invalid email or password.');
  }
});

// @desc    Send OTP to user's email for login/registration
// @route   POST /api/auth/otp/send
export const sendEmailOtp = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = await User.findOneAndUpdate(
        { email: email.toLowerCase() },
        { $set: { otp, otpExpiry }, $setOnInsert: { name: 'New Artist', email: email.toLowerCase() } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    
    await sendEmail({
        to: user.email,
        subject: 'Your Artistry Store Login Code',
        html: `<p>Your One-Time Password is: <b>${otp}</b></p><p>It will expire in 10 minutes.</p>`,
    });

    res.status(200).json({ message: `An OTP has been sent to ${user.email}.` });
});

// @desc    Verify email OTP and log the user in
// @route   POST /api/auth/otp/verify
export const verifyEmailOtp = asyncHandler(async (req: Request, res: Response) => {
    const { email, otp } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || user.otp !== otp || !user.otpExpiry || user.otpExpiry < new Date()) {
        res.status(400);
        throw new Error('Invalid or expired OTP.');
    }
    
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();
    
    generateAndRespond(res, user);
});

// @desc    Get current user profile
// @route   GET /api/auth/me
export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
    res.json(req.user);
});

// @desc    Update user profile
// @route   PUT /api/auth/me
export const updateMe = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await User.findById(req.user!._id);
    if (user) {
        user.name = req.body.name || user.name;
        if (req.body.addresses) user.addresses = req.body.addresses;
        const updatedUser = await user.save();
        generateAndRespond(res, updatedUser);
    } else {
        res.status(404);
        throw new Error('User not found.');
    }
});