import Discount, { IDiscount, DiscountType } from "../models/discount.model";
import { IProduct } from "../models/product.model";
import mongoose from "mongoose";

export interface DiscountedProduct extends IProduct {
  finalPrice: number;
  discountAmount: number;
  discountPercentage: number;
  hasDiscount: boolean;
  appliedDiscount?: IDiscount;
}

export class DiscountService {
  /**
   * Calculate discounts for a single product
   */
  static async calculateProductDiscount(
    product: IProduct
  ): Promise<DiscountedProduct> {
    const now = new Date();

    // Find applicable discounts for this product
    const applicableDiscounts = await Discount.find({
      isActive: true,
      status: "Active",
      startDate: { $lte: now },
      endDate: { $gte: now },
      $or: [
        { applicableProducts: product._id }, // Product-specific discount
        { applicableCategories: product.category }, // Category-specific discount
        { applicableCategories: product.subcategory }, // Subcategory-specific discount
        {
          // Brand-specific discount (if product has brand)
          ...(product.brand
            ? {
                $and: [
                  { applicableBrands: { $exists: true } },
                  { applicableBrands: product.brand },
                ],
              }
            : {}),
        },
      ],
    }).sort({ value: -1 }); // Sort by highest discount value first

    if (applicableDiscounts.length === 0) {
      return {
        ...product.toObject(),
        finalPrice: product.price,
        discountAmount: 0,
        discountPercentage: 0,
        hasDiscount: false,
      } as DiscountedProduct;
    }

    // Apply the best discount (highest value)
    const bestDiscount = applicableDiscounts[0];
    const discountAmount = this.calculateDiscountAmount(
      product.price,
      bestDiscount
    );
    const finalPrice = Math.max(0, product.price - discountAmount);
    const discountPercentage =
      product.price > 0 ? (discountAmount / product.price) * 100 : 0;

    return {
      ...product.toObject(),
      finalPrice,
      discountAmount,
      discountPercentage: Math.round(discountPercentage * 100) / 100,
      hasDiscount: discountAmount > 0,
      appliedDiscount: bestDiscount,
    } as DiscountedProduct;
  }

  /**
   * Calculate discounts for multiple products
   */
  static async calculateProductsDiscounts(
    products: IProduct[]
  ): Promise<DiscountedProduct[]> {
    const now = new Date();

    // Get all product IDs, category IDs, and brands for batch query
    const productIds = products.map((p) => p._id);
    const categoryIds = [
      ...new Set([
        ...products.map((p) => p.category),
        ...products.map((p) => p.subcategory).filter(Boolean),
      ]),
    ];
    const brands = [...new Set(products.map((p) => p.brand).filter(Boolean))];

    // Find all applicable discounts in one query
    const applicableDiscounts = await Discount.find({
      isActive: true,
      status: "Active",
      startDate: { $lte: now },
      endDate: { $gte: now },
      $or: [
        { applicableProducts: { $in: productIds } },
        { applicableCategories: { $in: categoryIds } },
        ...(brands.length > 0 ? [{ applicableBrands: { $in: brands } }] : []),
      ],
    });

    // Group discounts by type for efficient lookup
    const discountsByProduct = new Map<string, IDiscount[]>();
    const discountsByCategory = new Map<string, IDiscount[]>();
    const discountsByBrand = new Map<string, IDiscount[]>();

    applicableDiscounts.forEach((discount) => {
      // Group by products
      discount.applicableProducts?.forEach((productId) => {
        if (!discountsByProduct.has(productId.toString())) {
          discountsByProduct.set(productId.toString(), []);
        }
        discountsByProduct.get(productId.toString())!.push(discount);
      });

      // Group by categories
      discount.applicableCategories?.forEach((categoryId) => {
        if (!discountsByCategory.has(categoryId.toString())) {
          discountsByCategory.set(categoryId.toString(), []);
        }
        discountsByCategory.get(categoryId.toString())!.push(discount);
      });

      // Group by brands
      discount.applicableBrands?.forEach((brand) => {
        if (!discountsByBrand.has(brand)) {
          discountsByBrand.set(brand, []);
        }
        discountsByBrand.get(brand)!.push(discount);
      });
    });

    // Calculate discounts for each product
    return products.map((product) => {
      const applicableDiscounts = [
        ...(discountsByProduct.get(product._id.toString()) || []),
        ...(discountsByCategory.get(product.category.toString()) || []),
        ...(discountsByCategory.get(product.subcategory?.toString() || "") ||
          []),
        ...(discountsByBrand.get(product.brand || "") || []),
      ];

      if (applicableDiscounts.length === 0) {
        return {
          ...product.toObject(),
          finalPrice: product.price,
          discountAmount: 0,
          discountPercentage: 0,
          hasDiscount: false,
        } as DiscountedProduct;
      }

      // Apply the best discount (highest value)
      const bestDiscount = applicableDiscounts.sort(
        (a, b) => b.value - a.value
      )[0];
      const discountAmount = this.calculateDiscountAmount(
        product.price,
        bestDiscount
      );
      const finalPrice = Math.max(0, product.price - discountAmount);
      const discountPercentage =
        product.price > 0 ? (discountAmount / product.price) * 100 : 0;

      return {
        ...product.toObject(),
        finalPrice,
        discountAmount,
        discountPercentage: Math.round(discountPercentage * 100) / 100,
        hasDiscount: discountAmount > 0,
        appliedDiscount: bestDiscount,
      } as DiscountedProduct;
    });
  }

  /**
   * Calculate discount amount based on discount type and value
   */
  private static calculateDiscountAmount(
    originalPrice: number,
    discount: IDiscount
  ): number {
    if (discount.discountType === DiscountType.PERCENTAGE) {
      const discountAmount = (originalPrice * discount.value) / 100;
      // Apply max discount limit if specified
      if (
        discount.maxDiscountAmount &&
        discountAmount > discount.maxDiscountAmount
      ) {
        return discount.maxDiscountAmount;
      }
      return discountAmount;
    } else {
      // Fixed amount discount
      return Math.min(discount.value, originalPrice);
    }
  }

  /**
   * Get active discounts for admin panel
   */
  static async getActiveDiscounts(): Promise<IDiscount[]> {
    return await Discount.find({
      isActive: true,
      status: "Active",
      endDate: { $gte: new Date() },
    }).sort({ createdAt: -1 });
  }

  /**
   * Create a new discount
   */
  static async createDiscount(discountData: any): Promise<IDiscount> {
    return await Discount.create(discountData);
  }

  /**
   * Update discount usage count
   */
  static async incrementDiscountUsage(discountId: string): Promise<void> {
    await Discount.findByIdAndUpdate(discountId, {
      $inc: { usedCount: 1 },
    });
  }
}
