import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import Coupon from '../models/coupon.model';
import { AuthRequest } from '../middleware/auth.middleware';

export const createCoupon = asyncHandler(async (req: AuthRequest, res: Response) => {
    const coupon = await Coupon.create(req.body);
    res.status(201).json(coupon);
});

export const getAllCoupons = asyncHandler(async (req: AuthRequest, res: Response) => {
    const coupons = await Coupon.find({});
    res.json(coupons);
});

/**
 * @desc    Delete a coupon by ID
 * @route   DELETE /api/coupons/:id
 * @access  Private/Admin
 */
export const deleteCoupon = asyncHandler(async (req: AuthRequest, res: Response) => {
  // 1. Get the coupon ID from the URL parameters
  const couponId = req.params.id;

  // 2. Attempt to find the coupon by its ID
  const coupon = await Coupon.findById(couponId);

  // 3. ✅ CRITICAL: Handle the "Not Found" case
  if (!coupon) {
    res.status(404); // Not Found
    throw new Error('Coupon not found');
  }

  // 4. If the coupon exists, delete it.
  // Using findByIdAndDelete is efficient.
  await Coupon.findByIdAndDelete(couponId);

  // 5. Send a success response.
  // A 200 status with a message is good, or a 204 (No Content) is also common for DELETE.
  res.status(200).json({ message: 'Coupon deleted successfully' });
});

// The "apply coupon" logic would be part of the Order creation process.