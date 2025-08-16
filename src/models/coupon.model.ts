import mongoose, { Document, Schema, Model } from 'mongoose';
import { IUser } from './user.model';

export enum DiscountType { PERCENTAGE = 'Percentage', FIXED = 'Fixed' }

export interface ICoupon extends Document {
  code: string;
  discountType: DiscountType;
  value: number;
  expiryDate: Date;
  usedBy: IUser['_id'][];
}

const couponSchema: Schema<ICoupon> = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  discountType: { type: String, enum: Object.values(DiscountType), required: true },
  value: { type: Number, required: true, min: 0 },
  expiryDate: { type: Date, required: true },
  usedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

const Coupon: Model<ICoupon> = mongoose.model<ICoupon>('Coupon', couponSchema);
export default Coupon;