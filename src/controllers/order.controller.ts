import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import Order, { IOrder, OrderStatus } from "../models/order.model";
import Product, { Availability } from "../models/product.model";
import { IUser } from "../models/user.model"; // Import the user interface
import { v2 as cloudinary } from "cloudinary"; // Import cloudinary
import Coupon from "../models/coupon.model"; // ✅ Import the Coupon model
import mongoose from "mongoose";
import { sendEmail } from "../utils/sendEmail"; // Assuming you have a utility function to send emails
import Shipping from "../models/shipping.model"; // Import shipping model

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const { orderItems, couponCode, shippingAddress } = req.body;

  if (!orderItems || orderItems.length === 0) {
    console.error("Validation Error: No order items provided.");
    res.status(400);
    throw new Error("No order items provided");
  }

  try {
    let subtotal = 0;
    const productsForOrder = [];

    // Step 1: Verify and Reserve Stock Atomically
    for (const item of orderItems) {
      const productId = item.productId;
      const requestedQuantity = item.quantity;

      // Find product
      const product = await Product.findById(productId);

      if (!product) {
        throw new Error(`Product not found with ID: ${productId}`);
      }

      // Check if sufficient stock is available (quantity - reserved)
      const availableQuantity = product.quantity - product.reserved;
      if (availableQuantity < requestedQuantity) {
        throw new Error(
          `Not enough stock available for ${product.title}. Only ${availableQuantity} available, ${requestedQuantity} requested.`
        );
      }

      // Atomically reserve the quantity using $inc operator
      if (product.availability === Availability.IN_STOCK) {
        await Product.findByIdAndUpdate(productId, {
          $inc: { reserved: requestedQuantity },
        });
      }

      // Calculate item total
      const itemTotal = product.price * requestedQuantity;
      subtotal += itemTotal;

      // Prepare product data for order
      productsForOrder.push({
        product: product._id,
        quantity: requestedQuantity,
        priceAtPurchase: product.price,
      });
    }

    // Step 2: Calculate Shipping Cost
    let shippingCost = 0;
    try {
      // Get shipping configuration
      const shippingConfig = await Shipping.findOne({
        isActive: true,
      });

      // Use configuration or default values
      const shippingCharge = shippingConfig?.shippingCharge || 50;
      const freeShippingThreshold =
        shippingConfig?.freeShippingThreshold || 1000;

      // Check if order qualifies for free shipping
      if (subtotal >= freeShippingThreshold) {
        shippingCost = 0;
      } else {
        shippingCost = shippingCharge;
      }
    } catch (error) {
      console.error("Error calculating shipping:", error);
      // Fallback shipping calculation
      shippingCost = subtotal >= 700 ? 0 : 50;
    }

    // Step 3: Apply Coupon Logic (if provided)
    let finalAmount = subtotal + shippingCost;
    let discountAmount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
      });
      if (!coupon) {
        throw new Error("Coupon not found or is invalid.");
      }
      if (coupon.expiryDate < new Date()) {
        throw new Error("This coupon has expired.");
      }

      if (coupon.discountType === "Fixed") {
        discountAmount = coupon.value;
      } else if (coupon.discountType === "Percentage") {
        discountAmount = ((subtotal + shippingCost) * coupon.value) / 100;
      }

      finalAmount = Math.max(0, subtotal + shippingCost - discountAmount);
      appliedCoupon = coupon._id;
    }

    // Step 4: Create the Order (all products successfully reserved)
    const orderData = {
      user: req.user?._id,
      products: productsForOrder,
      shippingAddress: shippingAddress,
      subtotal: subtotal,
      shippingCost: shippingCost,
      discountAmount: discountAmount,
      finalAmount: finalAmount,
      coupon: appliedCoupon,
      status: OrderStatus.PENDING_CONFIRMATION, // Start with pending confirmation
    };

    const createdOrder = await Order.create(orderData);

    // Order created successfully

    console.log(
      `Order ${createdOrder._id} created successfully with reserved inventory`
    );
    res.status(201).json(createdOrder);
  } catch (error) {
    console.error("\n--- ERROR OCCURRED ---");
    console.error("Error:", error);
    throw error; // Pass the error to the global error handler
  }
});

// @desc    Handle payment fulfillment - transition from reserved to shipped
// @route   POST /api/orders/:id/fulfill-payment
export const fulfillPayment = asyncHandler(
  async (req: Request, res: Response) => {
    const orderId = req.params.id;
    const { paymentId, paymentStatus } = req.body;

    if (!paymentId || paymentStatus !== "completed") {
      res.status(400);
      throw new Error("Payment must be completed to fulfill order");
    }

    try {
      // Find the order with populated products
      const order = await Order.findById(orderId).populate("products.product");

      if (!order) {
        throw new Error("Order not found");
      }

      if (
        order.status !== OrderStatus.PENDING_CONFIRMATION &&
        order.status !== OrderStatus.AWAITING_PAYMENT
      ) {
        throw new Error("Order is not in a state that can be fulfilled");
      }

      // Step 1: Transition inventory from reserved to shipped
      for (const item of order.products) {
        const product = item.product as any;
        const requestedQuantity = item.quantity;

        if (product && product.availability === Availability.IN_STOCK) {
          // Atomically update: decrease quantity and reserved
          await Product.findByIdAndUpdate(product._id, {
            $inc: {
              quantity: -requestedQuantity, // Decrease actual stock
              reserved: -requestedQuantity, // Release reserved amount
            },
          });
        }
      }

      // Step 2: Update order status and payment details
      order.status = OrderStatus.DISPATCHED;
      order.paymentDetails = {
        paymentId: paymentId,
        status: "Completed",
      };

      await order.save();

      console.log(
        `Order ${orderId} fulfilled successfully - inventory transitioned from reserved to shipped`
      );
      res.json({
        message: "Payment fulfilled successfully",
        order: order,
      });
    } catch (error) {
      throw error;
    }
  }
);

export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const orders = await Order.find({ user: req.user!._id }).populate(
    "products.product",
    "title images"
  );
  res.json(orders);
});

export const getAllOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const orders = await Order.find({})
      .populate("user", "name email")
      .populate("products.product", "title");
    res.json(orders);
  }
);

// export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
//     const { status } = req.body;
//     const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
//     if (!order) {
//         res.status(404);
//         throw new Error('Order not found');
//     }
//     res.json(order);
// });

export const adminUpdateOrderStatus = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const orderId = req.params.id;
    const { status: newStatus } = req.body;

    try {
      const order = await Order.findById(orderId).populate("products.product");

      if (!order) {
        res.status(404);
        throw new Error("Order not found");
      }

      const previousStatus = order.status;

      // If status is the same, just return the order
      if (previousStatus === newStatus) {
        res.json(order);
        return;
      }

      // Handle order cancellation with proper inventory restoration
      if (
        newStatus === OrderStatus.CANCELLED &&
        previousStatus !== OrderStatus.CANCELLED
      ) {
        // Restore reserved stock back to available inventory
        for (const item of order.products) {
          const product = item.product as any;
          const quantityToRestore = item.quantity;

          if (product && product.availability === Availability.IN_STOCK) {
            // Atomically restore reserved stock
            await Product.findByIdAndUpdate(product._id, {
              $inc: { reserved: -quantityToRestore },
            });
          }
        }
      }

      // Handle order fulfillment (payment confirmed)
      if (
        newStatus === OrderStatus.DISPATCHED &&
        (previousStatus === OrderStatus.PENDING_CONFIRMATION ||
          previousStatus === OrderStatus.AWAITING_PAYMENT)
      ) {
        // Transition from reserved to shipped
        for (const item of order.products) {
          const product = item.product as any;
          const quantityToShip = item.quantity;

          if (product && product.availability === Availability.IN_STOCK) {
            // Atomically update: decrease quantity and reserved
            await Product.findByIdAndUpdate(product._id, {
              $inc: {
                quantity: -quantityToShip, // Decrease actual stock
                reserved: -quantityToShip, // Release reserved amount
              },
            });
          }
        }
      }

      // Update the order status
      order.status = newStatus;
      await order.save();

      console.log(
        `Order ${orderId} status updated from ${previousStatus} to ${newStatus}`
      );
      res.json(order);
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Upload a payment screenshot for an order
// @route   POST /api/orders/:id/upload-screenshot
export const uploadPaymentScreenshot = asyncHandler(
  async (req: Request, res: Response) => {
    const orderId = req.params.id;

    // 1. Check if a file was uploaded
    if (!req.file) {
      res.status(400);
      throw new Error("No screenshot file provided.");
    }

    const order = await Order.findById<IOrder>(orderId);

    if (!order) {
      res.status(404);
      throw new Error("Order not found.");
    }

    // 2. Security check
    if (!(order.user as any).equals(req.user!._id)) {
      res.status(403);
      throw new Error("Not authorized for this order.");
    }

    // 3. Upload the image buffer to Cloudinary
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: "payment_screenshots", // Store in a separate folder
    });

    // 4. Update the order with the screenshot URL
    order.manualPaymentDetails = {
      screenshotUrl: result.secure_url,
      submittedAt: new Date(),
    };
    order.status = OrderStatus.PENDING_VERIFICATION;

    await order.save();

    res.json({
      message:
        "Screenshot uploaded successfully. We will verify your payment shortly.",
      order: order,
    });
  }
);
