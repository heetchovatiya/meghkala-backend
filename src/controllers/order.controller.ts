import { Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import Order, { IOrder, OrderStatus } from "../models/order.model";
import Product, { Availability } from "../models/product.model";
import { IUser } from "../models/user.model"; // Import the user interface
import { v2 as cloudinary } from "cloudinary"; // Import cloudinary
import Coupon from "../models/coupon.model"; // ✅ Import the Coupon model

import { Request } from "../middleware/auth.middleware";
import { sendEmail } from "../utils/sendEmail"; // Assuming you have a utility function to send emails

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  // 1. Destructure orderItems and the new optional couponCode from the body
  const { orderItems, couponCode } = req.body;

  if (!orderItems || orderItems.length === 0) {
    res.status(400);
    throw new Error("No order items provided");
  }
  // --- NEW: Immediately Deduct Inventory ---
  const productUpdatePromises = [];
  let subtotal = 0;
  const productsForOrder = [];

  for (const item of orderItems) {
    const product = await Product.findById(item.productId);

    if (!product) {
      res.status(404);
      throw new Error(`Product not found: ${item.productId}`);
    }
    if (product.quantity < item.quantity) {
      res.status(400);
      throw new Error(
        `Not enough stock for ${product.title}. Only ${product.quantity} left.`
      );
    }

    // 2. Decrement the quantity
    product.quantity -= item.quantity;
    productUpdatePromises.push(product.save()); // Add the save promise to an array

    // Prepare data for the order document
    subtotal += product.price * item.quantity;
    productsForOrder.push({
      product: product._id,
      name: product.title, // Using 'name' for consistency with frontend
      image: product.images[0],
      quantity: item.quantity,
      priceAtPurchase: product.price,
    });
  }

  for (const item of orderItems) {
    const product = await Product.findById(item.productId);
    if (!product) {
      res.status(404);
      throw new Error(`Product not found: ${item.productId}`);
    }
    subtotal += product.price * item.quantity;
    productsForOrder.push({
      product: product._id,
      name: product.title,
      image: product.images[0],
      quantity: item.quantity,
      priceAtPurchase: product.price,
    });
  }

  // 3. ✅ --- NEW COUPON LOGIC --- ✅
  let finalAmount = subtotal;
  let discountAmount = 0;
  let appliedCoupon = null;

  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });

    // Validate the found coupon
    if (!coupon) {
      res.status(404);
      throw new Error("Coupon not found or is invalid.");
    }
    if (coupon.expiryDate < new Date()) {
      res.status(400);
      throw new Error("This coupon has expired.");
    }

    // Calculate discount
    if (coupon.discountType === "Fixed") {
      discountAmount = coupon.value;
    } else if (coupon.discountType === "Percentage") {
      discountAmount = (subtotal * coupon.value) / 100;
    }

    // Apply discount, ensuring the total doesn't go below zero
    finalAmount = Math.max(0, subtotal - discountAmount);
    appliedCoupon = coupon._id; // Store a reference to the coupon used
  }
  // ✅ --- END COUPON LOGIC --- ✅

  // 4. Create the new order with the calculated final amount
  const order = new Order({
    user: req.user?._id,
    products: productsForOrder,
    subtotal: subtotal,
    discountAmount: discountAmount,
    finalAmount: finalAmount,
    coupon: appliedCoupon, // Optional: save the coupon ID to the order
    status: "Awaiting Manual Payment", // The initial status
  });

  const createdOrder = await order.save();
  // ✅ IMPORTANT: Only after the order is successfully created,
  // execute all the saved product update promises.
  await Promise.all(productUpdatePromises);

  // 5. Respond with the created order
  res.status(201).json(createdOrder);
});

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
    try {
      const orderId = req.params.id;
      const { status: newStatus } = req.body;

      const order = await Order.findById(orderId).populate("products.product");

      if (!order) {
        res.status(404);
        throw new Error("Order not found");
      }

      const previousStatus = order.status;

      // ✅ --- THIS IS THE FIX --- ✅
      if (previousStatus === newStatus) {
        // If the status is the same, just send the response and STOP execution.
        // Do not use 'return'.
        res.json(order);
      } else {
        // If the status is different, proceed with the update logic.

        // Inventory logic for cancelled orders
        if (newStatus === "Cancelled" && previousStatus !== "Cancelled") {
          for (const item of order.products) {
            const product = item.product as any;
            if (product && product.availability === "IN_STOCK") {
              product.quantity += item.quantity;
              await product.save();
            }
          }
        }

        // Update the order status
        order.status = newStatus;
        const updatedOrder = await order.save();

        // Send the final response
        res.json(updatedOrder);
      }
      // ✅ ------------------------- ✅
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
