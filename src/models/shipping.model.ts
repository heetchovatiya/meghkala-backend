import mongoose, { Document, Schema, Model } from "mongoose";

export interface IShipping extends Document {
  shippingCharge: number; // Fixed shipping charge
  freeShippingThreshold: number; // Order total above which shipping is free
  isActive: boolean;
}

const shippingSchema: Schema<IShipping> = new Schema(
  {
    shippingCharge: { type: Number, required: true, min: 0 },
    freeShippingThreshold: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Shipping: Model<IShipping> = mongoose.model<IShipping>(
  "Shipping",
  shippingSchema
);
export default Shipping;
