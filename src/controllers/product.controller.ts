import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Product from "../models/product.model";
import Category from "../models/category.model";
import mongoose from "mongoose";

// --- CATEGORY CONTROLLERS ---

export const createCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const category = await Category.create(req.body);
    res.status(201).json(category);
  }
);

export const getAllCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const categories = await Category.find({});
    res.json(categories);
  }
);

export const deleteCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const productCount = await Product.countDocuments({
      category: req.params.id,
    });
    if (productCount > 0) {
      res.status(400);
      throw new Error("Cannot delete category. It is in use by products.");
    }
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: "Category removed" });
  }
);

// --- PRODUCT CONTROLLERS ---

export const createProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  }
);

export const getAllProducts = asyncHandler(
  async (req: Request, res: Response) => {
    // Destructure all possible query parameters from the request
    const { keyword, category, availability, sort } = req.query;

    // --- Build the filter object ---
    const filter: any = {};
    if (keyword) {
      // Search by product name (assuming your model uses 'name', not 'title')
      filter.name = { $regex: keyword as string, $options: "i" };
    }
    if (category) {
      filter.category = category as string;
    }
    if (availability) {
      filter.availability = availability as string;
    }

    // --- Build the sort object ---
    let sortOptions: any = {}; // Default to empty (Mongoose will use default order)

    if (sort === "price-asc") {
      sortOptions = { price: 1 }; // 1 for ascending
    } else if (sort === "price-desc") {
      sortOptions = { price: -1 }; // -1 for descending
    } else if (sort === "newest") {
      sortOptions = { createdAt: -1 }; // Sort by creation date, newest first
    }
    // Default case: if sort is undefined or something else, it sorts by newest
    else {
      sortOptions = { createdAt: -1 };
    }

    // --- Execute the query with both filter and sort ---
    const products = await Product.find(filter)
      .populate("category", "name") // Keep populating the category
      .sort(sortOptions); // Apply the sorting options

    res.json(products);
  }
);

export const getProductById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    // Validate ObjectId first
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error("Invalid product ID");
    }

    const product = await Product.findById(id).populate("category", "name");
    if (!product) {
      res.status(404);
      throw new Error("Product not found");
    }
    res.json(product);
  }
);

export const updateProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) {
      res.status(404);
      throw new Error("Product not found");
    }
    res.json(product);
  }
);

export const deleteProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      res.status(404);
      throw new Error("Product not found");
    }
    res.json({ message: "Product removed" });
  }
);
