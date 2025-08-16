import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  description?: string;
}

const categorySchema: Schema<ICategory> = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, trim: true },
}, { timestamps: true });

const Category: Model<ICategory> = mongoose.model<ICategory>('Category', categorySchema);
export default Category;