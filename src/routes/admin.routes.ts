import { Router } from 'express';
import { getAllUsers } from '../controllers/admin.controller';
import { protect, admin } from '../middleware/auth.middleware';

const router = Router();

// This route is first protected (must be logged in) and then checked for admin role
router.route('/users').get(protect, admin, getAllUsers);

// Add other admin-only routes here (e.g., managing coupons, viewing analytics)
// router.route('/products').post(protect, admin, createProduct);

export default router;