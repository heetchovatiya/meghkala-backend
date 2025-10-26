import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Product from "../models/product.model";
import Category from "../models/category.model";
import Review from "../models/review.model";
import mongoose from "mongoose";
import { DiscountService } from "../services/discount.service";

// --- CATEGORY CONTROLLERS ---

export const createCategory = asyncHandler(
  async (req: Request, res: Response) => {
    console.log("Creating category with data:", req.body);

    // Validate that if image is provided, it's a valid URL
    if (req.body.image && typeof req.body.image !== "string") {
      res.status(400);
      throw new Error("Image must be a valid URL string");
    }

    const category = await Category.create(req.body);
    console.log("Category created successfully:", category);
    res.status(201).json(category);
  }
);

export const getAllCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const { parentOnly } = req.query;

    let filter: any = { isActive: true };
    if (parentOnly === "true") {
      filter.parentCategory = null;
    }

    const categories = await Category.find(filter)
      .populate("parentCategory", "name")
      .sort({ sortOrder: 1, name: 1 });
    res.json(categories);
  }
);

export const getSubcategories = asyncHandler(
  async (req: Request, res: Response) => {
    const { parentId } = req.params;
    const subcategories = await Category.find({
      parentCategory: parentId,
      isActive: true,
    }).sort({ sortOrder: 1, name: 1 });
    res.json(subcategories);
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
    // Ensure price is stored correctly (fix the -100 issue)
    const productData = {
      ...req.body,
      price: Number(req.body.price), // Ensure price is properly converted to number
    };

    const product = await Product.create(productData);

    // Calculate discounts for the new product
    const discountedProduct = await DiscountService.calculateProductDiscount(
      product
    );

    res.status(201).json(discountedProduct);
  }
);

export const getAllProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      keyword,
      category,
      categories,
      subcategory,
      subcategories,
      availability,
      featured,
      minPrice,
      maxPrice,
      sort,
      page = 1,
      limit = 12,
    } = req.query;

    // Build the filter object
    const filter: any = {};

    if (keyword) {
      filter.$or = [
        { title: { $regex: keyword as string, $options: "i" } },
        { description: { $regex: keyword as string, $options: "i" } },
        { tags: { $in: [new RegExp(keyword as string, "i")] } },
      ];
    }

    // Handle single category (backward compatibility)
    if (category) {
      filter.category = category as string;
    }

    // Handle multiple categories
    if (categories) {
      const categoryIds = (categories as string).split(",").filter(Boolean);
      if (categoryIds.length > 0) {
        filter.category = { $in: categoryIds };
      }
    }

    // Handle single subcategory (backward compatibility)
    if (subcategory) {
      filter.subcategory = subcategory as string;
    }

    // Handle multiple subcategories
    if (subcategories) {
      const subcategoryIds = (subcategories as string)
        .split(",")
        .filter(Boolean);
      if (subcategoryIds.length > 0) {
        filter.subcategory = { $in: subcategoryIds };
      }
    }

    if (availability) {
      filter.availability = availability as string;
    }

    if (featured === "true") {
      filter.isFeatured = true;
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Build sort options
    let sortOptions: any = { createdAt: -1 };

    switch (sort) {
      case "price-asc":
        sortOptions = { price: 1 };
        break;
      case "price-desc":
        sortOptions = { price: -1 };
        break;
      case "name-asc":
        sortOptions = { title: 1 };
        break;
      case "name-desc":
        sortOptions = { title: -1 };
        break;
      case "featured":
        sortOptions = { isFeatured: -1, createdAt: -1 };
        break;
      case "newest":
      default:
        sortOptions = { createdAt: -1 };
        break;
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Execute query with pagination
    const products = await Product.find(filter)
      .populate("category", "name")
      .populate("subcategory", "name")
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit));

    // Calculate discounts for all products
    const discountedProducts = await DiscountService.calculateProductsDiscounts(
      products
    );

    // Get total count for pagination
    const total = await Product.countDocuments(filter);

    res.json({
      products: discountedProducts,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalProducts: total,
        hasNext: Number(page) < Math.ceil(total / Number(limit)),
        hasPrev: Number(page) > 1,
      },
    });
  }
);

export const getFeaturedProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const { limit = 8 } = req.query;

    const products = await Product.find({
      isFeatured: true,
      availability: "IN_STOCK",
    })
      .populate("category", "name")
      .populate("subcategory", "name")
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    // Calculate discounts for featured products
    const discountedProducts = await DiscountService.calculateProductsDiscounts(
      products
    );

    res.json(discountedProducts);
  }
);

export const searchProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      q,
      category,
      categories,
      subcategory,
      subcategories,
      sort,
      page = 1,
      limit = 12,
    } = req.query;

    if (!q) {
      res.status(400);
      throw new Error("Search query is required");
    }

    const filter: any = {
      $or: [
        { title: { $regex: q as string, $options: "i" } },
        { description: { $regex: q as string, $options: "i" } },
        { tags: { $in: [new RegExp(q as string, "i")] } },
      ],
    };

    // Handle single category (backward compatibility)
    if (category) {
      filter.category = category as string;
    }

    // Handle multiple categories
    if (categories) {
      const categoryIds = (categories as string).split(",").filter(Boolean);
      if (categoryIds.length > 0) {
        filter.category = { $in: categoryIds };
      }
    }

    // Handle single subcategory (backward compatibility)
    if (subcategory) {
      filter.subcategory = subcategory as string;
    }

    // Handle multiple subcategories
    if (subcategories) {
      const subcategoryIds = (subcategories as string)
        .split(",")
        .filter(Boolean);
      if (subcategoryIds.length > 0) {
        filter.subcategory = { $in: subcategoryIds };
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    let sortOptions: any = { createdAt: -1 };

    if (sort === "relevance") {
      // For relevance, we could implement a scoring system
      sortOptions = { title: 1 };
    }

    const products = await Product.find(filter)
      .populate("category", "name")
      .populate("subcategory", "name")
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit));

    // Calculate discounts for search results
    const discountedProducts = await DiscountService.calculateProductsDiscounts(
      products
    );

    const total = await Product.countDocuments(filter);

    res.json({
      products: discountedProducts,
      query: q,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalProducts: total,
        hasNext: Number(page) < Math.ceil(total / Number(limit)),
        hasPrev: Number(page) > 1,
      },
    });
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

    const product = await Product.findById(id)
      .populate("category", "name")
      .populate("subcategory", "name");

    if (!product) {
      res.status(404);
      throw new Error("Product not found");
    }

    // Calculate discounts for the product
    const discountedProduct = await DiscountService.calculateProductDiscount(
      product
    );

    // Get reviews for this product
    const reviews = await Review.find({ product: id })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    // Calculate average rating
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) /
          reviews.length
        : 0;

    res.json({
      ...discountedProduct,
      reviews,
      averageRating: Math.round(avgRating * 10) / 10,
      totalReviews: reviews.length,
    });
  }
);

export const updateProduct = asyncHandler(
  async (req: Request, res: Response) => {
    // Ensure price is stored correctly (fix the -100 issue)
    const updateData = {
      ...req.body,
      ...(req.body.price && { price: Number(req.body.price) }), // Ensure price is properly converted to number
    };

    const product = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });
    if (!product) {
      res.status(404);
      throw new Error("Product not found");
    }

    // Calculate discounts for the updated product
    const discountedProduct = await DiscountService.calculateProductDiscount(
      product
    );

    res.json(discountedProduct);
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

// --- REVIEW CONTROLLERS ---

export const createReview = asyncHandler(
  async (req: Request, res: Response) => {
    const { productId, rating, title, comment, images } = req.body;
    const userId = req.user!._id;

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      user: userId,
      product: productId,
    });
    if (existingReview) {
      res.status(400);
      throw new Error("You have already reviewed this product");
    }

    const review = await Review.create({
      user: userId,
      product: productId,
      rating,
      title,
      comment,
      images: images || [],
    });

    await review.populate("user", "name");
    res.status(201).json(review);
  }
);

export const getProductReviews = asyncHandler(
  async (req: Request, res: Response) => {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = "newest" } = req.query;

    let sortOptions: any = { createdAt: -1 };
    if (sort === "oldest") sortOptions = { createdAt: 1 };
    if (sort === "rating-high") sortOptions = { rating: -1 };
    if (sort === "rating-low") sortOptions = { rating: 1 };

    const skip = (Number(page) - 1) * Number(limit);

    const reviews = await Review.find({ product: productId })
      .populate("user", "name")
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit));

    const total = await Review.countDocuments({ product: productId });

    res.json({
      reviews,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalReviews: total,
        hasNext: Number(page) < Math.ceil(total / Number(limit)),
        hasPrev: Number(page) > 1,
      },
    });
  }
);

export const updateReview = asyncHandler(
  async (req: Request, res: Response) => {
    const { reviewId } = req.params;
    const userId = req.user!._id;

    const review = await Review.findOneAndUpdate(
      { _id: reviewId, user: userId },
      req.body,
      { new: true }
    ).populate("user", "name");

    if (!review) {
      res.status(404);
      throw new Error(
        "Review not found or you don't have permission to update it"
      );
    }

    res.json(review);
  }
);

export const deleteReview = asyncHandler(
  async (req: Request, res: Response) => {
    const { reviewId } = req.params;
    const userId = req.user!._id;

    const review = await Review.findOneAndDelete({
      _id: reviewId,
      user: userId,
    });
    if (!review) {
      res.status(404);
      throw new Error(
        "Review not found or you don't have permission to delete it"
      );
    }

    res.json({ message: "Review deleted successfully" });
  }
);

// Note: Discount functionality has been moved to the discount module
// All discount-related operations should use the discount API endpoints
