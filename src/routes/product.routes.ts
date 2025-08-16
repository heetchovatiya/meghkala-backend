import { Router } from 'express';
import { protect, admin } from '../middleware/auth.middleware';
import * as controller from '../controllers/product.controller';
import * as validator from '../validators/product.validator';

const router = Router();

// Category Routes (specific first)
router.route('/categories')
  .post(protect, admin, validator.validateCategory, controller.createCategory)
  .get(controller.getAllCategories);

router.route('/categories/:id')
  .delete(protect, admin, controller.deleteCategory);

// Product Routes
router.route('/')
  .post(protect, admin, validator.validateProduct, controller.createProduct)
  .get(controller.getAllProducts);

// Keep dynamic :id last
router.route('/:id')
  .get(controller.getProductById)
  .put(protect, admin, validator.validateProduct, controller.updateProduct)
  .delete(protect, admin, controller.deleteProduct);


export default router;