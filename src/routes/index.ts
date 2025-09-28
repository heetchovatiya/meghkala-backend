import { Router } from "express";
import authRoutes from "./auth.routes";
import adminRoutes from "./admin.routes";
import productRoutes from "./product.routes";
import orderRoutes from "./order.routes";
import couponRoutes from "./coupon.routes";
import shippingRoutes from "./shipping.routes";
import discountRoutes from "./discount.routes";
import dashboardRoutes from "./dashboard.routes";
import notificationRoutes from "./notification.routes";

const router = Router();

// Authentication & User Management
router.use("/auth", authRoutes);

// Products & Categories
router.use("/products", productRoutes);

// Orders
router.use("/orders", orderRoutes);

// Coupons
router.use("/coupons", couponRoutes);

// Discounts
router.use("/discounts", discountRoutes);

// Shipping
router.use("/shipping", shippingRoutes);

// Admin Panel Management
router.use("/admin", adminRoutes);

// Dashboard Analytics
router.use("/dashboard", dashboardRoutes);

// Notifications
router.use("/notifications", notificationRoutes);

export default router;
