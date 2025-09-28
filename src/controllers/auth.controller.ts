import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import User from "../models/user.model";
import generateToken from "../utils/generateToken";
import { sendEmail } from "../utils/sendEmail";

// Reusable function to format response and send token
const generateAndRespond = (res: Response, user: any) => {
  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    contactNumber: user.contactNumber,
    role: user.role,
    token: generateToken(user._id.toString()),
  });
};

// @desc    Register a new user (Traditional)
// @route   POST /api/auth/register
export const registerUser = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, email, contactNumber } = req.body;
    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400);
      throw new Error("User with this email already exists.");
    }
    const user = await User.create({ name, email, contactNumber });
    generateAndRespond(res, user);
  }
);

// @desc    Authenticate user & get token (Traditional)
// @route   POST /api/auth/login
export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (user) {
    generateAndRespond(res, user);
  } else {
    res.status(401);
    throw new Error("Invalid email or password.");
  }
});

// @desc    Check if user exists by email
// @route   POST /api/auth/check-user
export const checkUserExists = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      res.status(400);
      throw new Error("Email is required");
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    res.status(200).json({
      exists: !!user,
      user: user
        ? { name: user.name, contactNumber: user.contactNumber }
        : null,
    });
  }
);

// @desc    Send OTP to user's email for login/registration
// @route   POST /api/auth/otp/send
export const sendEmailOtp = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, name, contactNumber, isNewUser } = req.body;

    // Validate required fields for new users
    if (isNewUser && (!name || !contactNumber)) {
      res.status(400);
      throw new Error("Name and contact number are required for new users");
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    let user;

    if (isNewUser) {
      // Create new user with provided information
      user = await User.create({
        name,
        email: email.toLowerCase(),
        contactNumber,
        otp,
        otpExpiry,
      });
    } else {
      // Update existing user with OTP
      user = await User.findOneAndUpdate(
        { email: email.toLowerCase() },
        { otp, otpExpiry },
        { new: true }
      );

      if (!user) {
        res.status(404);
        throw new Error("User not found");
      }
    }

    await sendEmail({
      to: user.email,
      subject: "Your Artistry Store Login Code",
      html: `<p>Your One-Time Password is: <b>${otp}</b></p><p>It will expire in 10 minutes.</p>`,
    });

    res.status(200).json({
      message: `An OTP has been sent to ${user.email}.`,
      isNewUser: !!isNewUser,
    });
  }
);

// @desc    Verify email OTP and log the user in
// @route   POST /api/auth/otp/verify
export const verifyEmailOtp = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, otp } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (
      !user ||
      user.otp !== otp ||
      !user.otpExpiry ||
      user.otpExpiry < new Date()
    ) {
      res.status(400);
      throw new Error("Invalid or expired OTP.");
    }

    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    generateAndRespond(res, user);
  }
);

// @desc    Get current user profile
// @route   GET /api/auth/me
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  res.json(req.user);
});

// @desc    Update user profile
// @route   PUT /api/auth/me
export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!._id);
  if (user) {
    user.name = req.body.name || user.name;
    user.contactNumber = req.body.contactNumber || user.contactNumber;
    if (req.body.addresses) user.addresses = req.body.addresses;
    const updatedUser = await user.save();
    generateAndRespond(res, updatedUser);
  } else {
    res.status(404);
    throw new Error("User not found.");
  }
});

// @desc    Add a new address to user profile
// @route   POST /api/auth/addresses
export const addAddress = asyncHandler(async (req: Request, res: Response) => {
  const { type, line1, city, postalCode, country, contactNumber } = req.body;

  if (!line1 || !city || !postalCode || !country || !contactNumber) {
    res.status(400);
    throw new Error("All address fields are required");
  }

  const user = await User.findById(req.user!._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const newAddress = {
    type: type || "Shipping",
    line1,
    city,
    postalCode,
    country,
    contactNumber,
  };

  user.addresses.push(newAddress as any);
  await user.save();

  res.status(201).json({
    message: "Address added successfully",
    address: newAddress,
    addresses: user.addresses,
  });
});

// @desc    Update an existing address
// @route   PUT /api/auth/addresses/:addressId
export const updateAddress = asyncHandler(
  async (req: Request, res: Response) => {
    const { addressId } = req.params;
    const { type, line1, city, postalCode, country, contactNumber } = req.body;

    if (!line1 || !city || !postalCode || !country || !contactNumber) {
      res.status(400);
      throw new Error("All address fields are required");
    }

    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    const addressIndex = user.addresses.findIndex(
      (addr: any) => addr._id.toString() === addressId
    );

    if (addressIndex === -1) {
      res.status(404);
      throw new Error("Address not found");
    }

    user.addresses[addressIndex] = {
      ...user.addresses[addressIndex],
      type: type || user.addresses[addressIndex].type,
      line1,
      city,
      postalCode,
      country,
      contactNumber,
    } as any;

    await user.save();

    res.status(200).json({
      message: "Address updated successfully",
      address: user.addresses[addressIndex],
      addresses: user.addresses,
    });
  }
);

// @desc    Delete an address
// @route   DELETE /api/auth/addresses/:addressId
export const deleteAddress = asyncHandler(
  async (req: Request, res: Response) => {
    const { addressId } = req.params;

    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    const addressIndex = user.addresses.findIndex(
      (addr: any) => addr._id.toString() === addressId
    );

    if (addressIndex === -1) {
      res.status(404);
      throw new Error("Address not found");
    }

    user.addresses.splice(addressIndex, 1);
    await user.save();

    res.status(200).json({
      message: "Address deleted successfully",
      addresses: user.addresses,
    });
  }
);

// @desc    Get all user addresses
// @route   GET /api/auth/addresses
export const getAddresses = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    res.status(200).json({
      addresses: user.addresses,
    });
  }
);
