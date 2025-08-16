import { Router } from 'express';
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';
import productRoutes from './product.routes';
import uploadRoutes from './upload.routes';
import orderRoutes from './order.routes';
import couponRoutes from './coupon.routes';

const router = Router();

// Authentication & User Management
router.use('/auth', authRoutes);

// Products & Categories
router.use('/products', productRoutes);

// Image Uploads
router.use('/upload', uploadRoutes);

// Orders
router.use('/orders', orderRoutes);

// Coupons
router.use('/coupons', couponRoutes);

// Admin Panel Management
router.use('/admin', adminRoutes);

export default router;
