import { Request,Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import Order, { IOrder, OrderStatus } from "../models/order.model";
import Product, { Availability } from "../models/product.model";
import { IUser } from "../models/user.model"; // Import the user interface
import { v2 as cloudinary } from "cloudinary"; // Import cloudinary
import Coupon from "../models/coupon.model"; // ✅ Import the Coupon model
import mongoose from "mongoose";
import { sendEmail } from "../utils/sendEmail"; // Assuming you have a utility function to send emails


export const createOrder = asyncHandler(async (req: Request, res: Response) => {
 
  const { orderItems, couponCode, shippingAddress } = req.body;

  if (!orderItems || orderItems.length === 0) {
    console.error("Validation Error: No order items provided.");
    res.status(400);
    throw new Error("No order items provided");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const productReservationPromises = [];
    let subtotal = 0;
    const productsForOrder = [];

    // --- SINGLE, CORRECT LOOP TO PROCESS ORDER ITEMS ---
    for (const [index, item] of orderItems.entries()) {
      const product = await Product.findById(item.productId).session(session);

      if (!product) {
        throw new Error(`Product not found with ID: ${item.productId}`);
      }
      
      if (product.availableQuantity < item.quantity) {
        throw new Error(`Not enough stock for ${product.title}. Only ${product.availableQuantity} available.`);
      }

      if (product.availability === 'IN_STOCK') {
        product.reserved += item.quantity;
        productReservationPromises.push(product.save({ session }));
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      productsForOrder.push({
        product: product._id,
        title: product.title,
        image: product.images[0],
        quantity: item.quantity,
        priceAtPurchase: product.price,
      });
    }


    // --- COUPON VALIDATION LOGIC ---
    let finalAmount = subtotal;
    let discountAmount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() }).session(session);
      if (!coupon) { throw new Error("Coupon not found or is invalid."); }
      if (coupon.expiryDate < new Date()) { throw new Error("This coupon has expired."); }
      
      if (coupon.discountType === "Fixed") { discountAmount = coupon.value; }
      else if (coupon.discountType === "Percentage") { discountAmount = (subtotal * coupon.value) / 100; }
      
      finalAmount = Math.max(0, subtotal - discountAmount);
      appliedCoupon = coupon._id;
    } else {
      console.log("No coupon code provided.");
    }
    
    // --- ORDER CREATION ---
    const orderData = {
      user: req.user?._id,
      products: productsForOrder,
      shippingAddress: shippingAddress,
      subtotal: subtotal,
      discountAmount: discountAmount,
      finalAmount: finalAmount,
      coupon: appliedCoupon,
      status: "Awaiting Manual Payment",
    };

    const [createdOrder] = await Order.create([orderData], { session });
    
    await Promise.all(productReservationPromises);
    
    await session.commitTransaction();
    
    res.status(201).json(createdOrder);

  } catch (error) {
    console.error("\n--- ERROR OCCURRED: Aborting transaction ---");
    await session.abortTransaction();
    console.error("Transaction aborted.");
    throw error; // Pass the error to the global error handler
  } finally {
    session.endSession();
    console.log("Database session ended.");
    console.log("--- CREATE ORDER REQUEST FINISHED ---");
  }
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
