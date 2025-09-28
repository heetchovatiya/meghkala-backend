import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Notification from "../models/notification.model";
import Product from "../models/product.model";
import { sendEmail } from "../utils/sendEmail";

// @desc    Create a stock notification request
// @route   POST /api/notifications/stock-alert
export const createStockNotification = asyncHandler(
  async (req: Request, res: Response) => {
    const { productId, email } = req.body;

    if (!productId || !email) {
      res.status(400);
      throw new Error("Product ID and email are required");
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404);
      throw new Error("Product not found");
    }

    // Check if product is already in stock
    if (product.quantity > 0) {
      res.status(400);
      throw new Error("Product is already in stock");
    }

    // Check if user already has a notification for this product
    const existingNotification = await Notification.findOne({
      product: productId,
      email: email,
    });

    if (existingNotification) {
      if (existingNotification.status === "cancelled") {
        // Reactivate the notification
        existingNotification.status = "pending";
        await existingNotification.save();
        res.json({ message: "Notification reactivated successfully" });
      } else {
        res.status(400);
        throw new Error("You already have a notification for this product");
      }
    } else {
      // Create new notification
      const notification = await Notification.create({
        product: productId,
        email: email,
        status: "pending",
      });

      res.status(201).json({
        message: "Notification created successfully",
        notification,
      });
    }
  }
);

// @desc    Get user's stock notifications
// @route   GET /api/notifications/stock-alerts
export const getUserStockNotifications = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;

    if (!userId) {
      res.status(401);
      throw new Error("User not authenticated");
    }

    const notifications = await Notification.find({
      user: userId,
      status: "pending",
    }).populate("product", "title images price");

    res.json(notifications);
  }
);

// @desc    Cancel a stock notification
// @route   DELETE /api/notifications/stock-alert/:id
export const cancelStockNotification = asyncHandler(
  async (req: Request, res: Response) => {
    const notificationId = req.params.id;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401);
      throw new Error("User not authenticated");
    }

    const notification = await Notification.findOne({
      _id: notificationId,
      user: userId,
    });

    if (!notification) {
      res.status(404);
      throw new Error("Notification not found");
    }

    notification.status = "cancelled";
    await notification.save();

    res.json({ message: "Notification cancelled successfully" });
  }
);

// @desc    Send stock notifications for a product (Admin only)
// @route   POST /api/notifications/send-stock-alerts/:productId
export const sendStockNotifications = asyncHandler(
  async (req: Request, res: Response) => {
    const productId = req.params.productId;

    // Check if product exists and is in stock
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404);
      throw new Error("Product not found");
    }

    if (product.quantity <= 0) {
      res.status(400);
      throw new Error("Product is not in stock");
    }

    // Find all pending notifications for this product
    const notifications = await Notification.find({
      product: productId,
      status: "pending",
    }).populate("user", "name email");

    if (notifications.length === 0) {
      res.json({ message: "No pending notifications found for this product" });
      return;
    }

    // Send emails to all users who requested notifications
    const emailPromises = notifications.map(async (notification) => {
      try {
        const emailData = {
          to: notification.email,
          subject: `${product.title} is back in stock!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Great news! ${product.title} is back in stock!</h2>
              <p>Hi there,</p>
              <p>We're excited to let you know that <strong>${product.title}</strong> is now available again!</p>
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Product Details:</h3>
                <p><strong>Price:</strong> ₹${product.price}</p>
                <p><strong>Stock:</strong> ${product.quantity} available</p>
              </div>
              <p>Don't miss out! <a href="${process.env.FRONTEND_URL}/products/${product._id}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Product</a></p>
              <p>Best regards,<br>The Meghkala Team</p>
            </div>
          `,
        };

        await sendEmail(emailData);

        // Update notification status
        notification.status = "sent";
        notification.notifiedAt = new Date();
        await notification.save();

        return { success: true, email: notification.email };
      } catch (error) {
        console.error(`Failed to send email to ${notification.email}:`, error);
        return {
          success: false,
          email: notification.email,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    });

    const results = await Promise.all(emailPromises);
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    res.json({
      message: `Stock notifications sent successfully`,
      total: notifications.length,
      successful,
      failed,
      results,
    });
  }
);

// @desc    Get all stock notifications (Admin only)
// @route   GET /api/notifications/admin/stock-alerts
export const getAllStockNotifications = asyncHandler(
  async (req: Request, res: Response) => {
    const notifications = await Notification.find()
      .populate("user", "name email")
      .populate("product", "title images price quantity")
      .sort({ createdAt: -1 });

    res.json(notifications);
  }
);
