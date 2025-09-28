import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Order, { OrderStatus } from "../models/order.model";
import User from "../models/user.model";
import Product from "../models/product.model";
import Notification from "../models/notification.model";
import Category from "../models/category.model";
import Coupon from "../models/coupon.model";

// @desc    Get comprehensive analytics for the admin dashboard
// @route   GET /api/dashboard/stats
export const getDashboardStats = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1
      );
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // Get basic counts
      const [
        totalUsers,
        totalProducts,
        totalOrders,
        totalCoupons,
        totalRevenueData,
        orderStatusCounts,
        recentOrders,
        monthlyRevenueData,
        lastMonthRevenueData,
        monthlyOrders,
        lastMonthOrders,
        monthlyNewUsers,
        lastMonthNewUsers,
        lowStockProducts,
        activeCoupons,
        lowStockProductsDetails,
      ] = await Promise.all([
        User.countDocuments(),
        Product.countDocuments(),
        Order.countDocuments(),
        Coupon.countDocuments(),
        Order.aggregate([
          { $match: { status: OrderStatus.DELIVERED } },
          { $group: { _id: null, totalRevenue: { $sum: "$finalAmount" } } },
        ]),
        Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        Order.find({})
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("user", "name email"),
        Order.aggregate([
          {
            $match: {
              status: OrderStatus.DELIVERED,
              createdAt: { $gte: startOfMonth },
            },
          },
          { $group: { _id: null, monthlyRevenue: { $sum: "$finalAmount" } } },
        ]),
        Order.aggregate([
          {
            $match: {
              status: OrderStatus.DELIVERED,
              createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
            },
          },
          { $group: { _id: null, lastMonthRevenue: { $sum: "$finalAmount" } } },
        ]),
        Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
        Order.countDocuments({
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
        }),
        User.countDocuments({ createdAt: { $gte: startOfMonth } }),
        User.countDocuments({
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
        }),
        Product.countDocuments({
          $expr: { $lte: [{ $subtract: ["$quantity", "$reserved"] }, 1] },
        }),
        Coupon.countDocuments({ expiryDate: { $gte: now } }),
        // Get low stock products details
        Product.find({
          $expr: { $lte: [{ $subtract: ["$quantity", "$reserved"] }, 1] },
        })
          .select("title quantity reserved images")
          .populate("category", "name")
          .limit(10),
      ]);

      // Calculate growth percentages
      const revenueGrowth = lastMonthRevenueData[0]?.lastMonthRevenue
        ? (((monthlyRevenueData[0]?.monthlyRevenue || 0) -
            lastMonthRevenueData[0].lastMonthRevenue) /
            lastMonthRevenueData[0].lastMonthRevenue) *
          100
        : 0;

      const orderGrowth = lastMonthOrders
        ? ((monthlyOrders - lastMonthOrders) / lastMonthOrders) * 100
        : 0;

      const userGrowth = lastMonthNewUsers
        ? ((monthlyNewUsers - lastMonthNewUsers) / lastMonthNewUsers) * 100
        : 0;

      // Format the order status counts
      const formattedOrderStatus = orderStatusCounts.reduce((acc, item) => {
        acc[item._id.replace(/\s+/g, "_").toLowerCase()] = item.count;
        return acc;
      }, {});

      res.json({
        // Revenue Analytics
        revenue: {
          total: totalRevenueData[0]?.totalRevenue || 0,
          monthly: monthlyRevenueData[0]?.monthlyRevenue || 0,
          growth: revenueGrowth,
          byMonth: [], // Simplified for now
        },

        // Order Analytics
        orders: {
          total: totalOrders,
          monthly: monthlyOrders,
          growth: orderGrowth,
          byStatus: formattedOrderStatus,
          byMonth: [], // Simplified for now
        },

        // User Analytics
        users: {
          total: totalUsers,
          monthly: monthlyNewUsers,
          growth: userGrowth,
          byMonth: [], // Simplified for now
        },

        // Product Analytics
        products: {
          total: totalProducts,
          lowStock: lowStockProducts,
          lowStockDetails: lowStockProductsDetails,
          topSelling: [], // Simplified for now
          categoryStats: [], // Simplified for now
        },

        // Recent Activity
        recentActivity: {
          orders: recentOrders,
          users: [], // Simplified for now
        },

        // Coupon Analytics
        coupons: {
          total: totalCoupons,
          active: activeCoupons,
          usageStats: [], // Simplified for now
        },
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({
        error: "Failed to fetch dashboard statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
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
    const { id } = req.params;
    const { status } = req.body;

    const notification = await Notification.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({ message: "Notification not found" });
      return;
    }

    res.json(notification);
  }
);
