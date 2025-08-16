import { Router } from 'express';
import { protect, admin } from '../middleware/auth.middleware';
import * as controller from '../controllers/order.controller';
import { upload } from '../middleware/upload.middleware'; // Import the upload middleware

const router = Router();

router.route('/')
  .post(protect, controller.createOrder)
  .get(protect, admin, controller.getAllOrders);

router.route('/myorders').get(protect, controller.getMyOrders);

router.route('/:id/status').put(protect, admin, controller.adminUpdateOrderStatus);

router.route('/:id/upload-screenshot').post(protect, upload.single('screenshot'), controller.uploadPaymentScreenshot);

export default router;