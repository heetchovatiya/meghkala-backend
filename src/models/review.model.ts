import mongoose, { Document, Schema, Model } from "mongoose";
import { IUser } from "./user.model";
import { IProduct } from "./product.model";

export interface IReview extends Document {
  user: IUser["_id"];
  product: IProduct["_id"];
  rating: number;
  title: string;
  comment: string;
  isVerified: boolean;
  helpful: number;
  images?: string[];
}

const reviewSchema: Schema<IReview> = new Schema(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    product: { type: Schema.Types.ObjectId, required: true, ref: "Product" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    comment: { type: String, required: true, trim: true, maxlength: 1000 },
    isVerified: { type: Boolean, default: false },
    helpful: { type: Number, default: 0 },
    images: [{ type: String }],
  },
  { timestamps: true }
);

// Ensure one review per user per product
reviewSchema.index({ user: 1, product: 1 }, { unique: true });
reviewSchema.index({ product: 1, rating: 1 });
reviewSchema.index({ isVerified: 1 });

const Review: Model<IReview> = mongoose.model<IReview>("Review", reviewSchema);
export default Review;
