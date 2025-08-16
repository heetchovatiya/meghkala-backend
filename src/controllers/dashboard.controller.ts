import { Response } from "express";
import asyncHandler from "express-async-handler";
import Order, { OrderStatus } from "../models/order.model";
import User from "../models/user.model";
import Product from "../models/product.model";
import Notification from "../models/notification.model";

// @desc    Get key statistics for the admin dashboard
// @route   GET /api/dashboard/stats
export const getDashboardStats = asyncHandler(
  async (req: Request, res: Response) => {
    const [
      totalRevenueData,
      orderStatusCounts,
      totalUsers,
      totalProducts,
      recentOrders,
    ] = await Promise.all([
      // 1. Calculate Total Revenue (only from delivered orders)
      Order.aggregate([
        { $match: { status: OrderStatus.DELIVERED } },
        { $group: { _id: null, totalRevenue: { $sum: "$finalAmount" } } },
      ]),
      // 2. Count Orders by Status
      Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      // 3. Count Total Users
      User.countDocuments(),
      // 4. Count Total Products
      Product.countDocuments(),
      // 5. Get 5 most recent orders
      Order.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("user", "name email"),
    ]);

    // Format the order status counts into a key-value object
    const formattedOrderStatus = orderStatusCounts.reduce((acc, item) => {
      acc[item._id.replace(/\s+/g, "_").toLowerCase()] = item.count;
      return acc;
    }, {});

    res.json({
      totalRevenue: totalRevenueData[0]?.totalRevenue || 0,
      totalUsers,
      totalProducts,
      orderStatus: formattedOrderStatus,
      recentOrders,
    });
  }
);

// @desc    Get all "Notify Me" requests
// @route   GET /api/dashboard/notifications
export const getNotifications = asyncHandler(
  async (req: Request, res: Response) => {
    const notifications = await Notification.find({})
      .populate("user", "name email")
      .populate("product", "title images");
    res.json(notifications);
  }
);

// @desc    Update the status of a notification request
// @route   PUT /api/dashboard/notifications/:id
export const updateNotificationStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { status } = req.body;
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!notification) {
      res.status(404);
      throw new Error("Notification request not found");
    }

    res.json(notification);
  }
);
