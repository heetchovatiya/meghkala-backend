import mongoose, { Document, Schema, Model } from "mongoose";

export interface ICategory extends Document {
  name: string;
  description?: string;
  parentCategory?: mongoose.Schema.Types.ObjectId;
  isActive: boolean;
  image?: string;
  sortOrder: number;
}

const categorySchema: Schema<ICategory> = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    isActive: { type: Boolean, default: true },
    image: { type: String },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Index for efficient queries
categorySchema.index({ parentCategory: 1, isActive: 1 });
categorySchema.index({ name: 1 });

const Category: Model<ICategory> = mongoose.model<ICategory>(
  "Category",
  categorySchema
);
export default Category;
