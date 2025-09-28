import { body, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";
import Category from "../models/category.model";
import { Availability } from "../models/product.model";

const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });
  next();
};

export const validateCategory = [
  body("name").trim().notEmpty().withMessage("Category name is required."),
  body("image").optional().isURL().withMessage("Image must be a valid URL."),
  body("parentCategory")
    .optional()
    .isMongoId()
    .withMessage("Invalid parent category ID."),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description must be less than 500 characters."),
  body("sortOrder")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Sort order must be a non-negative integer."),
  handleValidationErrors,
];

export const validateProduct = [
  body("title").trim().notEmpty().withMessage("Title is required."),
  body("description").trim().notEmpty().withMessage("Description is required."),
  body("price").isFloat({ gt: 0 }).withMessage("Price must be greater than 0."),
  body("images")
    .isArray({ min: 1 })
    .withMessage("At least one image URL is required."),
  body("category")
    .isMongoId()
    .withMessage("Invalid Category ID.")
    .custom(async (value) => {
      const category = await Category.findById(value);
      if (!category) return Promise.reject("Category not found.");
    }),
  body("availability")
    .isIn(Object.values(Availability))
    .withMessage("Invalid availability status."),
  body("quantity")
    .isInt({ min: 0 })
    .withMessage("Quantity must be a non-negative integer.")
    .custom((value, { req }) => {
      if (req.body.availability === Availability.IN_STOCK && value < 1) {
        throw new Error("Quantity must be at least 1 for in-stock items.");
      }
      if (req.body.availability === Availability.MADE_TO_ORDER && value !== 0) {
        throw new Error("Quantity must be 0 for made-to-order items.");
      }
      return true;
    }),
  handleValidationErrors,
];
