import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to handle requests for routes that do not exist.
 * This should be placed after all other routes in your server setup.
 *
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The Express next middleware function.
 */
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  // Create a new Error object for the 404 Not Found error.
  const error = new Error(`Not Found - ${req.originalUrl}`);
  // Set the HTTP status code on the response object.
  res.status(404);
  // Pass the error to the next middleware in the chain, which will be our errorHandler.
  next(error);
};

/**
 * Custom global error handling middleware.
 * This catches all errors passed via `next(error)` from any async route.
 * It ensures that errors are sent back as a consistent JSON object.
 * This must be the LAST middleware added to the app.
 *
 * @param {Error} err - The error object.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The Express next middleware function (unused here, but required for Express to recognize it as an error handler).
 */
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // Sometimes an error might come through with a 200 OK status code.
  // If so, we default to a 500 Internal Server Error. Otherwise, use the status code from the error.
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);

  // Send a JSON response with the error message.
  // In production, you might want to hide the stack trace for security.
  res.json({
    message: err.message,
    // The stack trace is useful for debugging in development mode.
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};