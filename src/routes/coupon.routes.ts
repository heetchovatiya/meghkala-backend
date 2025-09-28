import { Router } from "express";
import { protect, admin } from "../middleware/auth.middleware";
import * as controller from "../controllers/coupon.controller";
import { validateCoupon } from "../validators/coupon.validator";

const router = Router();

// Public routes
router.route("/validate").get(controller.validateCoupon);

// Private routes
router.route("/apply").post(protect, controller.applyCoupon);

// Admin routes
router
  .route("/")
  .post(protect, admin, validateCoupon, controller.createCoupon)
  .get(protect, admin, controller.getAllCoupons);

router
  .route("/:id")
  .get(protect, admin, controller.getCouponById)
  .put(protect, admin, controller.updateCoupon)
  .delete(protect, admin, controller.deleteCoupon);

export default router;
