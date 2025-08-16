import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { DiscountType } from '../models/coupon.model';

const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
};

export const validateCoupon = [
  body('code').trim().notEmpty().withMessage('Coupon code is required.'),
  body('discountType').isIn(Object.values(DiscountType)).withMessage('Invalid discount type.'),
  body('value').isFloat({ gt: 0 }).withMessage('Discount value must be greater than 0.'),
  body('expiryDate').isISO8601().toDate().withMessage('Invalid expiry date.'),
  handleValidationErrors,
];