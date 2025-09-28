import { Router } from "express";
import { protect, admin } from "../middleware/auth.middleware";
import * as controller from "../controllers/discount.controller";

const router = Router();

// Public routes
router.route("/active").get(controller.getActiveDiscounts);
router.route("/calculate").post(controller.calculateDiscounts);

// Private routes
router.route("/apply").post(protect, controller.applyDiscount);

// Admin routes
router
  .route("/")
  .post(protect, admin, controller.createDiscount)
  .get(protect, admin, controller.getAllDiscounts);

router
  .route("/:id")
  .get(protect, admin, controller.getDiscountById)
  .put(protect, admin, controller.updateDiscount)
  .delete(protect, admin, controller.deleteDiscount);

export default router;
