import mongoose, { Document, Schema, Model } from "mongoose";
import { ICategory } from "./category.model";

export enum Availability {
  IN_STOCK = "IN_STOCK",
  MADE_TO_ORDER = "MADE_TO_ORDER",
}

export interface IProduct extends Document {
  title: string;
  description: string;
  price: number;
  images: string[];
  category: ICategory["_id"];
  subcategory?: ICategory["_id"];
  brand?: string; // Added brand field for brand-wise discounts
  availability: Availability;
  quantity: number;
  reserved: number;
  availableQuantity: number; // A virtual property, not stored in DB
  isFeatured: boolean;
  sku: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  tags: string[];
  // Virtual properties for discount calculation
  finalPrice: number;
  discountAmount: number;
  discountPercentage: number;
  hasDiscount: boolean;
}

const productSchema: Schema<IProduct> = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    images: [{ type: String, required: true }],
    category: { type: Schema.Types.ObjectId, required: true, ref: "Category" },
    subcategory: { type: Schema.Types.ObjectId, ref: "Category" },
    brand: { type: String, trim: true }, // Added brand field
    availability: {
      type: String,
      enum: Object.values(Availability),
      required: true,
    },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    reserved: { type: Number, default: 0, min: 0 },
    isFeatured: { type: Boolean, default: false },
    sku: { type: String, required: true, unique: true },
    weight: { type: Number, min: 0 },
    dimensions: {
      length: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
    },
    tags: [{ type: String, trim: true }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create the virtual property to calculate available stock on the fly
productSchema.virtual("availableQuantity").get(function (this: IProduct) {
  return this.quantity - this.reserved;
});

// Virtual properties for discount calculation (will be calculated in service)
productSchema.virtual("finalPrice").get(function (this: IProduct) {
  return this.price; // Will be overridden by discount service
});

productSchema.virtual("discountAmount").get(function (this: IProduct) {
  return 0; // Will be calculated by discount service
});

productSchema.virtual("discountPercentage").get(function (this: IProduct) {
  return 0; // Will be calculated by discount service
});

productSchema.virtual("hasDiscount").get(function (this: IProduct) {
  return false; // Will be calculated by discount service
});

// Add indexes for better performance
productSchema.index({ category: 1, subcategory: 1, isFeatured: 1 });
productSchema.index({ title: "text", description: "text", tags: "text" });
productSchema.index({ sku: 1 });
productSchema.index({ price: 1 });
productSchema.index({ isFeatured: 1, availability: 1 });
productSchema.index({ brand: 1 }); // Added brand index for brand-wise discounts

const Product: Model<IProduct> = mongoose.model<IProduct>(
  "Product",
  productSchema
);
export default Product;
