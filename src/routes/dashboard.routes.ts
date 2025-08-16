import { Router } from 'express';
import { protect, admin } from '../middleware/auth.middleware';
import * as controller from '../controllers/dashboard.controller';

const router = Router();

/**
 * @route   GET /api/dashboard/stats
 * @desc    Gets key analytics for the main dashboard view.
 * @access  Private/Admin
 */
router.get('/stats', protect, admin, controller.getDashboardStats);

/**
 * @route   GET /api/dashboard/notifications
 * @desc    Gets all "Notify Me" requests from users.
 * @access  Private/Admin
 */
router.route('/notifications')
  .get(protect, admin, controller.getNotifications);

/**
 * @route   PUT /api/dashboard/notifications/:id
 * @desc    Updates the status of a specific notification request.
 * @access  Private/Admin
 */
router.route('/notifications/:id')
  .put(protect, admin, controller.updateNotificationStatus);

export default router;