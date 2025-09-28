import { Router } from "express";
import { protect, admin } from "../middleware/auth.middleware";
import * as controller from "../controllers/product.controller";
import * as validator from "../validators/product.validator";

const router = Router();

// Category Routes
router
  .route("/categories")
  .post(protect, admin, validator.validateCategory, controller.createCategory)
  .get(controller.getAllCategories);

router
  .route("/categories/:id")
  .delete(protect, admin, controller.deleteCategory);

router
  .route("/categories/:parentId/subcategories")
  .get(controller.getSubcategories);

// Product Routes
router
  .route("/")
  .post(protect, admin, validator.validateProduct, controller.createProduct)
  .get(controller.getAllProducts);

router.route("/featured").get(controller.getFeaturedProducts);

router.route("/search").get(controller.searchProducts);

// Note: Discount routes have been moved to the discount module

// Review Routes
router
  .route("/:productId/reviews")
  .post(protect, controller.createReview)
  .get(controller.getProductReviews);

router
  .route("/reviews/:reviewId")
  .put(protect, controller.updateReview)
  .delete(protect, controller.deleteReview);

// Keep dynamic :id last
router
  .route("/:id")
  .get(controller.getProductById)
  .put(protect, admin, validator.validateProduct, controller.updateProduct)
  .delete(protect, admin, controller.deleteProduct);

export default router;
