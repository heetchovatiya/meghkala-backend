import { Router } from 'express';
import { protect, admin } from '../middleware/auth.middleware';
import * as controller from '../controllers/coupon.controller';
import { validateCoupon } from '../validators/coupon.validator';

const router = Router();

router.route('/')
  .post(protect, admin, validateCoupon, controller.createCoupon)
  .get(protect, admin, controller.getAllCoupons);

router.route('/:id')
  .delete(protect, admin, controller.deleteCoupon);

export default router;