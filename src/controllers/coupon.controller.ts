import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Coupon from "../models/coupon.model";

// @desc    Create a new coupon
// @route   POST /api/coupons
// @access  Private/Admin
export const createCoupon = asyncHandler(
  async (req: Request, res: Response) => {
    const coupon = await Coupon.create(req.body);
    res.status(201).json(coupon);
  }
);

// @desc    Get all coupons
// @route   GET /api/coupons
// @access  Private/Admin
export const getAllCoupons = asyncHandler(
  async (req: Request, res: Response) => {
    const coupons = await Coupon.find({}).sort({ createdAt: -1 });
    res.json(coupons);
  }
);

// @desc    Get coupon by ID
// @route   GET /api/coupons/:id
// @access  Private/Admin
export const getCouponById = asyncHandler(
  async (req: Request, res: Response) => {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      res.status(404);
      throw new Error("Coupon not found");
    }
    res.json(coupon);
  }
);

// @desc    Update coupon
// @route   PUT /api/coupons/:id
// @access  Private/Admin
export const updateCoupon = asyncHandler(
  async (req: Request, res: Response) => {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!coupon) {
      res.status(404);
      throw new Error("Coupon not found");
    }
    res.json(coupon);
  }
);

// @desc    Delete a coupon by ID
// @route   DELETE /api/coupons/:id
// @access  Private/Admin
export const deleteCoupon = asyncHandler(
  async (req: Request, res: Response) => {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      res.status(404);
      throw new Error("Coupon not found");
    }
    res.json({ message: "Coupon deleted successfully" });
  }
);

// @desc    Validate coupon code
// @route   GET /api/coupons/validate?code=CODE
// @access  Public
export const validateCoupon = asyncHandler(
  async (req: Request, res: Response) => {
    const { code } = req.query;

    if (!code) {
      res.status(400);
      throw new Error("Coupon code is required");
    }

    const coupon = await Coupon.findOne({
      code: (code as string).toUpperCase().trim(),
    });

    if (!coupon) {
      res.status(404);
      throw new Error("Invalid coupon code");
    }

    // Check if coupon has expired
    if (coupon.expiryDate < new Date()) {
      res.status(400);
      throw new Error("This coupon has expired");
    }

    res.json({
      code: coupon.code,
      discountType: coupon.discountType,
      value: coupon.value,
      expiryDate: coupon.expiryDate,
    });
  }
);

// @desc    Apply coupon to order
// @route   POST /api/coupons/apply
// @access  Private
export const applyCoupon = asyncHandler(async (req: Request, res: Response) => {
  const { code, orderTotal } = req.body;

  if (!code || !orderTotal) {
    res.status(400);
    throw new Error("Coupon code and order total are required");
  }

  const coupon = await Coupon.findOne({
    code: code.toUpperCase().trim(),
  });

  if (!coupon) {
    res.status(404);
    throw new Error("Invalid coupon code");
  }

  // Check if coupon has expired
  if (coupon.expiryDate < new Date()) {
    res.status(400);
    throw new Error("This coupon has expired");
  }

  // Check if user has already used this coupon
  const userId = req.user!._id;
  if (coupon.usedBy.includes(userId)) {
    res.status(400);
    throw new Error("You have already used this coupon");
  }

  // Calculate discount amount
  let discountAmount = 0;
  if (coupon.discountType === "Fixed") {
    discountAmount = Math.min(coupon.value, orderTotal);
  } else {
    discountAmount = (orderTotal * coupon.value) / 100;
  }

  const finalAmount = Math.max(0, orderTotal - discountAmount);

  res.json({
    coupon: {
      code: coupon.code,
      discountType: coupon.discountType,
      value: coupon.value,
      expiryDate: coupon.expiryDate,
    },
    discountAmount,
    finalAmount,
    originalAmount: orderTotal,
  });
});
