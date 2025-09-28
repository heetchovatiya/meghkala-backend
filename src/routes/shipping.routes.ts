import { Router } from "express";
import { protect, admin } from "../middleware/auth.middleware";
import * as controller from "../controllers/shipping.controller";

const router = Router();

// Public routes
router.route("/").get(controller.getShippingConfig);

router.route("/default").get(controller.getDefaultShippingMethod);

router.route("/calculate").post(controller.calculateShippingCost);

// Admin routes
router.route("/").put(protect, admin, controller.updateShippingConfig);

export default router;
