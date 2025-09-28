import mongoose, { Document, Schema, Model } from "mongoose";
import { IUser } from "./user.model";
import { IProduct } from "./product.model";

export interface INotification extends Document {
  user: IUser["_id"];
  product: IProduct["_id"];
  email: string;
  status: "pending" | "sent" | "cancelled";
  createdAt: Date;
  notifiedAt?: Date;
}

const notificationSchema: Schema<INotification> = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    email: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "sent", "cancelled"],
      default: "pending",
    },
    notifiedAt: { type: Date },
  },
  { timestamps: true }
);

// Ensure one notification per user per product
notificationSchema.index({ user: 1, product: 1 }, { unique: true });

const Notification: Model<INotification> = mongoose.model<INotification>(
  "Notification",
  notificationSchema
);

export default Notification;
