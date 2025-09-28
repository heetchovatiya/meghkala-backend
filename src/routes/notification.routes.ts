import { Router } from "express";
import { protect, admin } from "../middleware/auth.middleware";
import * as controller from "../controllers/notification.controller";

const router = Router();

/**
 * @route   POST /api/notifications/stock-alert
 * @desc    Create a stock notification request
 * @access  Private
 */
router.route("/stock-alert").post(protect, controller.createStockNotification);

/**
 * @route   GET /api/notifications/stock-alerts
 * @desc    Get user's stock notifications
 * @access  Private
 */
router
  .route("/stock-alerts")
  .get(protect, controller.getUserStockNotifications);

/**
 * @route   DELETE /api/notifications/stock-alert/:id
 * @desc    Cancel a stock notification
 * @access  Private
 */
router
  .route("/stock-alert/:id")
  .delete(protect, controller.cancelStockNotification);

/**
 * @route   POST /api/notifications/send-stock-alerts/:productId
 * @desc    Send stock notifications for a product
 * @access  Private/Admin
 */
router
  .route("/send-stock-alerts/:productId")
  .post(protect, admin, controller.sendStockNotifications);

/**
 * @route   GET /api/notifications/admin/stock-alerts
 * @desc    Get all stock notifications
 * @access  Private/Admin
 */
router
  .route("/admin/stock-alerts")
  .get(protect, admin, controller.getAllStockNotifications);

export default router;
