import mongoose, { Document, Schema, Model } from "mongoose";
import { IUser } from "./user.model";
import { IProduct } from "./product.model";

export enum OrderStatus {
  AWAITING_MANUAL_PAYMENT = "Awaiting Manual Payment",
  PENDING_VERIFICATION = "Pending Verification",
  PENDING_CONFIRMATION = "Pending Confirmation",
  AWAITING_PAYMENT = "Awaiting Payment",
  PROCESSING = "Processing",
  DISPATCHED = "Dispatched",
  DELIVERED = "Delivered",
  CANCELLED = "Cancelled",
}

// Interface for the payment details sub-document
interface IPaymentDetails {
  paymentId?: string;
  status: "Pending" | "Completed" | "Failed";
}

// Main Order Interface with the new 'paymentDetails' property
export interface IOrder extends Document {
  user: IUser["_id"];
  products: {
    product: IProduct["_id"];
    quantity: number;
    priceAtPurchase: number;
  }[];
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  finalAmount: number;
  status: OrderStatus;
  coupon?: mongoose.Schema.Types.ObjectId;
  shippingMethod?: mongoose.Schema.Types.ObjectId;
  shippingAddress: {
    name: string;
    line1: string;
    city: string;
    postalCode: string;
    country: string;
    contactNumber: string;
  };
  paymentDetails?: IPaymentDetails;
  manualPaymentDetails?: {
    screenshotUrl?: string;
    submittedAt?: Date;
  };
}

// The Mongoose Schema for the Order document
const orderSchema: Schema<IOrder> = new Schema(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    products: [
      {
        product: {
          type: Schema.Types.ObjectId,
          required: true,
          ref: "Product",
        },
        quantity: { type: Number, required: true },
        priceAtPurchase: { type: Number, required: true },
      },
    ],
    subtotal: { type: Number, required: true },
    shippingCost: { type: Number, required: true, default: 0 },
    discountAmount: { type: Number, required: true, default: 0 },
    finalAmount: { type: Number, required: true },
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      required: false,
    },
    shippingMethod: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shipping",
      required: false,
    },
    shippingAddress: {
      name: { type: String, required: true },
      line1: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
      contactNumber: { type: String, required: true },
    },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING_CONFIRMATION,
    },
    manualPaymentDetails: {
      screenshotUrl: { type: String },
      submittedAt: { type: Date },
    },
  },
  { timestamps: true }
);

const Order: Model<IOrder> = mongoose.model<IOrder>("Order", orderSchema);
export default Order;
