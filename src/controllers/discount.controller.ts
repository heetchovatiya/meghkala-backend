import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Discount from "../models/discount.model";
import Product from "../models/product.model";

// @desc    Create a new discount
// @route   POST /api/discounts
// @access  Private/Admin
export const createDiscount = asyncHandler(
  async (req: Request, res: Response) => {
    const discount = await Discount.create(req.body);
    res.status(201).json(discount);
  }
);

// @desc    Get all discounts
// @route   GET /api/discounts
// @access  Private/Admin
export const getAllDiscounts = asyncHandler(
  async (req: Request, res: Response) => {
    const discounts = await Discount.find({}).sort({ createdAt: -1 });
    res.json(discounts);
  }
);

// @desc    Get active discounts
// @route   GET /api/discounts/active
// @access  Public
export const getActiveDiscounts = asyncHandler(
  async (req: Request, res: Response) => {
    const now = new Date();
    const discounts = await Discount.find({
      isActive: true,
      status: "Active",
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).sort({ createdAt: -1 });
    res.json(discounts);
  }
);

// @desc    Get discount by ID
// @route   GET /api/discounts/:id
// @access  Private/Admin
export const getDiscountById = asyncHandler(
  async (req: Request, res: Response) => {
    const discount = await Discount.findById(req.params.id);
    if (!discount) {
      res.status(404);
      throw new Error("Discount not found");
    }
    res.json(discount);
  }
);

// @desc    Update discount
// @route   PUT /api/discounts/:id
// @access  Private/Admin
export const updateDiscount = asyncHandler(
  async (req: Request, res: Response) => {
    const discount = await Discount.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!discount) {
      res.status(404);
      throw new Error("Discount not found");
    }
    res.json(discount);
  }
);

// @desc    Delete discount
// @route   DELETE /api/discounts/:id
// @access  Private/Admin
export const deleteDiscount = asyncHandler(
  async (req: Request, res: Response) => {
    const discount = await Discount.findByIdAndDelete(req.params.id);
    if (!discount) {
      res.status(404);
      throw new Error("Discount not found");
    }
    res.json({ message: "Discount deleted successfully" });
  }
);

// @desc    Calculate applicable discounts for cart
// @route   POST /api/discounts/calculate
// @access  Public
export const calculateDiscounts = asyncHandler(
  async (req: Request, res: Response) => {
    const { items, totalAmount } = req.body;

    if (!items || !Array.isArray(items) || !totalAmount) {
      res.status(400);
      throw new Error("Items array and total amount are required");
    }

    const now = new Date();
    const activeDiscounts = await Discount.find({
      isActive: true,
      status: "Active",
      startDate: { $lte: now },
      endDate: { $gte: now },
      minOrderAmount: { $lte: totalAmount },
    });

    const applicableDiscounts = [];

    for (const discount of activeDiscounts) {
      // Check if discount applies to any items in cart
      let isApplicable = false;

      if (
        discount.applicableCategories &&
        discount.applicableCategories.length > 0
      ) {
        // Check if any cart item belongs to applicable categories
        const productIds = items.map((item: any) => item.productId);
        const products = await Product.find({
          _id: { $in: productIds },
          category: { $in: discount.applicableCategories },
        });
        isApplicable = products.length > 0;
      } else if (
        discount.applicableProducts &&
        discount.applicableProducts.length > 0
      ) {
        // Check if any cart item is in applicable products
        const productIds = items.map((item: any) => item.productId);
        isApplicable = productIds.some((id: string) =>
          discount.applicableProducts!.includes(id as any)
        );
      } else {
        // General discount applicable to all products
        isApplicable = true;
      }

      if (isApplicable) {
        // Check usage limit
        if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
          continue;
        }

        // Calculate discount amount
        let discountAmount = 0;
        if (discount.discountType === "Fixed") {
          discountAmount = Math.min(discount.value, totalAmount);
        } else {
          discountAmount = (totalAmount * discount.value) / 100;
        }

        // Apply max discount limit if set
        if (discount.maxDiscountAmount) {
          discountAmount = Math.min(discountAmount, discount.maxDiscountAmount);
        }

        applicableDiscounts.push({
          _id: discount._id,
          name: discount.name,
          description: discount.description,
          discountType: discount.discountType,
          value: discount.value,
          discountAmount,
          finalAmount: Math.max(0, totalAmount - discountAmount),
        });
      }
    }

    // Sort by discount amount (highest first)
    applicableDiscounts.sort((a, b) => b.discountAmount - a.discountAmount);

    res.json({
      applicableDiscounts,
      totalAmount,
      bestDiscount: applicableDiscounts[0] || null,
    });
  }
);

// @desc    Apply discount to order
// @route   POST /api/discounts/apply
// @access  Private
export const applyDiscount = asyncHandler(
  async (req: Request, res: Response) => {
    const { discountId, orderTotal } = req.body;

    if (!discountId || !orderTotal) {
      res.status(400);
      throw new Error("Discount ID and order total are required");
    }

    const discount = await Discount.findById(discountId);
    if (!discount) {
      res.status(404);
      throw new Error("Discount not found");
    }

    // Check if discount is active and valid
    const now = new Date();
    if (
      !discount.isActive ||
      discount.status !== "Active" ||
      discount.startDate > now ||
      discount.endDate < now
    ) {
      res.status(400);
      throw new Error("This discount is not currently active");
    }

    // Check minimum order amount
    if (discount.minOrderAmount && orderTotal < discount.minOrderAmount) {
      res.status(400);
      throw new Error(
        `Minimum order amount of ₹${discount.minOrderAmount} required for this discount`
      );
    }

    // Check usage limit
    if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
      res.status(400);
      throw new Error("This discount has reached its usage limit");
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (discount.discountType === "Fixed") {
      discountAmount = Math.min(discount.value, orderTotal);
    } else {
      discountAmount = (orderTotal * discount.value) / 100;
    }

    // Apply max discount limit if set
    if (discount.maxDiscountAmount) {
      discountAmount = Math.min(discountAmount, discount.maxDiscountAmount);
    }

    const finalAmount = Math.max(0, orderTotal - discountAmount);

    res.json({
      discount: {
        _id: discount._id,
        name: discount.name,
        description: discount.description,
        discountType: discount.discountType,
        value: discount.value,
      },
      discountAmount,
      finalAmount,
      originalAmount: orderTotal,
    });
  }
);
