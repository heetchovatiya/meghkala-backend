import mongoose, { Document, Schema, Model } from "mongoose";

export enum DiscountType {
  PERCENTAGE = "Percentage",
  FIXED = "Fixed",
}

export enum DiscountStatus {
  ACTIVE = "Active",
  INACTIVE = "Inactive",
  EXPIRED = "Expired",
}

export interface IDiscount extends Document {
  name: string;
  description: string;
  discountType: DiscountType;
  value: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  startDate: Date;
  endDate: Date;
  status: DiscountStatus;
  applicableCategories?: mongoose.Schema.Types.ObjectId[];
  applicableProducts?: mongoose.Schema.Types.ObjectId[];
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
}

const discountSchema: Schema<IDiscount> = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    discountType: {
      type: String,
      enum: Object.values(DiscountType),
      required: true,
    },
    value: { type: Number, required: true, min: 0 },
    minOrderAmount: { type: Number, min: 0 },
    maxDiscountAmount: { type: Number, min: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(DiscountStatus),
      default: DiscountStatus.ACTIVE,
    },
    applicableCategories: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    applicableProducts: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    usageLimit: { type: Number, min: 1 },
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes for better performance
discountSchema.index({ status: 1, isActive: 1 });
discountSchema.index({ startDate: 1, endDate: 1 });
discountSchema.index({ applicableCategories: 1 });
discountSchema.index({ applicableProducts: 1 });

const Discount: Model<IDiscount> = mongoose.model<IDiscount>(
  "Discount",
  discountSchema
);
export default Discount;
