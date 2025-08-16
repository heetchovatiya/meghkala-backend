import { body, validationResult, check } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Reusable middleware to handle any validation errors
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
};

export const validateRegister = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('email').isEmail().withMessage('Please provide a valid email.'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  handleValidationErrors,
];

export const validateLogin = [
  body('email').isEmail().withMessage('Valid email is required.'),
  body('password').exists().withMessage('Password is required.'),
  handleValidationErrors,
];

export const validateUpdateProfile = [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.'),
    body('addresses').optional().isArray().withMessage('Addresses must be an array.'),
    handleValidationErrors,
];

export const validateEmailOtp = [
    body('email').isEmail().withMessage('A valid email address is required.'),
    check('otp').optional().isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits.'),
    handleValidationErrors,
];