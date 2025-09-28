import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Shipping from "../models/shipping.model";

// @desc    Get shipping configuration
// @route   GET /api/shipping
export const getShippingConfig = asyncHandler(
  async (req: Request, res: Response) => {
    let shippingConfig = await Shipping.findOne({ isActive: true });

    // If no configuration exists, return default values
    if (!shippingConfig) {
      shippingConfig = {
        shippingCharge: 50,
        freeShippingThreshold: 1000,
        isActive: true,
      } as any;
    }

    res.json(shippingConfig);
  }
);

// @desc    Get default shipping method (for backward compatibility)
// @route   GET /api/shipping/default
export const getDefaultShippingMethod = asyncHandler(
  async (req: Request, res: Response) => {
    const shippingConfig = await Shipping.findOne({ isActive: true });

    // Use configuration or default values
    const shippingCharge = shippingConfig?.shippingCharge || 50;
    const freeShippingThreshold = shippingConfig?.freeShippingThreshold || 1000;
    const isActive = shippingConfig?.isActive || true;

    // Return in old format for compatibility
    res.json({
      _id: shippingConfig?._id || "default",
      name: "Standard Shipping",
      description: `Free shipping on orders above Rs. ${freeShippingThreshold}, otherwise Rs. ${shippingCharge} shipping charge`,
      basePrice: shippingCharge,
      freeShippingThreshold: freeShippingThreshold,
      isActive: isActive,
      estimatedDays: { min: 3, max: 5 },
      isFastDelivery: false,
      fastDeliveryExtraCharge: 0,
      countries: ["IN"],
      isDefault: true,
    });
  }
);

// @desc    Calculate shipping cost
// @route   POST /api/shipping/calculate
export const calculateShippingCost = asyncHandler(
  async (req: Request, res: Response) => {
    const { items, country } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400);
      throw new Error("Items array is required");
    }

    // Calculate total price
    const totalPrice = items.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0
    );

    // Get shipping configuration
    const shippingConfig = await Shipping.findOne({ isActive: true });

    // Use configuration or default values
    const shippingCharge = shippingConfig?.shippingCharge || 50;
    const freeShippingThreshold = shippingConfig?.freeShippingThreshold || 1000;

    // Simple shipping logic: Free above threshold, otherwise fixed charge
    let shippingCost = 0;
    if (totalPrice < freeShippingThreshold) {
      shippingCost = shippingCharge;
    }

    res.json({
      shippingCost,
      totalPrice,
      freeShippingThreshold: freeShippingThreshold,
      qualifiesForFreeShipping: totalPrice >= freeShippingThreshold,
      shippingCharge: shippingCharge,
    });
  }
);

// @desc    Update shipping configuration (Admin only)
// @route   PUT /api/shipping
export const updateShippingConfig = asyncHandler(
  async (req: Request, res: Response) => {
    const { shippingCharge, freeShippingThreshold } = req.body;

    // Validate required fields
    if (shippingCharge === undefined || freeShippingThreshold === undefined) {
      res.status(400);
      throw new Error("shippingCharge and freeShippingThreshold are required");
    }

    // Update or create shipping configuration
    let shippingConfig = await Shipping.findOne({ isActive: true });

    if (shippingConfig) {
      shippingConfig.shippingCharge = shippingCharge;
      shippingConfig.freeShippingThreshold = freeShippingThreshold;
      await shippingConfig.save();
    } else {
      shippingConfig = await Shipping.create({
        shippingCharge,
        freeShippingThreshold,
        isActive: true,
      });
    }

    res.json(shippingConfig);
  }
);
