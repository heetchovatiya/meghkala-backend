import mongoose, { Document, Schema, Model } from 'mongoose';
import { ICategory } from './category.model';

export enum Availability {
  IN_STOCK = 'IN_STOCK',
  MADE_TO_ORDER = 'MADE_TO_ORDER',
}

export interface IProduct extends Document {
  title: string;
  description: string;
  price: number;
  images: string[];
  category: ICategory['_id'];
  availability: Availability;
  quantity: number;
}

const productSchema: Schema<IProduct> = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  images: [{ type: String, required: true }],
  category: { type: Schema.Types.ObjectId, required: true, ref: 'Category' },
  availability: { type: String, enum: Object.values(Availability), required: true },
  quantity: { type: Number, required: true, min: 0, default: 0 },
}, { timestamps: true });

const Product: Model<IProduct> = mongoose.model<IProduct>('Product', productSchema);
export default Product;