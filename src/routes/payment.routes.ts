// // src/routes/payment.routes.ts

// import express, { Router, Request, Response } from 'express';
// import Stripe from 'stripe';
// import asyncHandler from 'express-async-handler';
// import { protect } from '../middleware/auth.middleware';
// import { Request } from '../middleware/auth.middleware'; // Import our custom type
// import Order, { IOrder, OrderStatus } from '../models/order.model';

// const router = Router();

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: '2025-07-30.basil', // Or whatever your error message specified
//   typescript: true,
// });

// /**
//  * @route   POST /api/payments/create-intent
//  */
// // The key fix is using Request here in the asyncHandler
// router.post('/create-intent', protect, asyncHandler(async (req: Request, res: Response) => {
//   // The 'protect' middleware GUARANTEES that req.user exists.
//   // There is no 'possibly undefined' error anymore because Request requires it.

//   const { orderId } = req.body;
//   if (!orderId) { res.status(400); throw new Error('Order ID is required.'); }

//   // FIX: Type the result of findById to solve the 'order.user is unknown' error
//   const order = await Order.findById<IOrder>(orderId);

//   if (!order) {
//     res.status(404);
//     throw new Error('Order not found.');
//   }

//   // This comparison is now fully type-safe because TS knows:
//   // 1. req.user is an IUser object.
//   // 2. order.user is an ObjectId.
//   if (!order.user.equals(req.user._id)) {
//     res.status(403);
//     throw new Error('Not authorized to pay for this order.');
//   }

//   if (order.status !== OrderStatus.AWAITING_PAYMENT) {
//     res.status(400);
//     throw new Error(`Order is not awaiting payment. Current status: ${order.status}`);
//   }

//   const paymentIntent = await stripe.paymentIntents.create({
//     amount: Math.round(order.finalAmount * 100),
//     currency: 'inr',
//     metadata: { orderId: order._id.toString() },
//   });

//   res.send({ clientSecret: paymentIntent.client_secret });
// }));

// // ... (The webhook route remains the same and is correct)
// router.post('/webhook', express.raw({ type: 'application/json' }), asyncHandler(async (req: Request, res: Response) => {
//     // ... webhook logic ...
// }));

// export default router;
