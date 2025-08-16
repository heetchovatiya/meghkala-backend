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
  reserved: number;
    availableQuantity: number; // A virtual property, not stored in DB

}

const productSchema: Schema<IProduct> = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  images: [{ type: String, required: true }],
  category: { type: Schema.Types.ObjectId, required: true, ref: 'Category' },
  availability: { type: String, enum: Object.values(Availability), required: true },
  quantity: { type: Number, required: true, min: 0, default: 0 },
    reserved: { type: Number, default: 0, min: 0 }, // ✅ ADD THIS FIELD

}, {
  timestamps: true,
  toJSON: { virtuals: true }, // Important: ensures virtuals are included in JSON responses
  toObject: { virtuals: true },
});


// Create the virtual property to calculate available stock on the fly
productSchema.virtual('availableQuantity').get(function(this: IProduct) {
  return this.quantity - this.reserved;
});


const Product: Model<IProduct> = mongoose.model<IProduct>('Product', productSchema);
export default Product;