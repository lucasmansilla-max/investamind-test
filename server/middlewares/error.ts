/**
 * Centralized error handling middleware
 * Formats errors consistently across the application
 */

import type { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
  details?: any;
}

/**
 * Error handler middleware
 * Catches all errors and formats them consistently
 */
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Don't log errors in test environment
  if (process.env.NODE_ENV !== 'test') {
    console.error('Error occurred:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  // Determine status code
  const status = err.status || err.statusCode || 500;
  
  // Determine error message
  let message = err.message || 'Internal Server Error';
  
  // Don't expose internal errors in production
  if (status === 500 && process.env.NODE_ENV === 'production') {
    message = 'Internal Server Error';
  }

  // Send error response
  res.status(status).json({
    message,
    ...(err.code && { code: err.code }),
    ...(err.details && process.env.NODE_ENV !== 'production' && { details: err.details }),
  });
}

/**
 * 404 handler - catches all unmatched routes
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.status(404).json({
    message: `Route ${req.method} ${req.path} not found`,
  });
}

/**
 * Async error wrapper - wraps async route handlers to catch errors
 */
export function asyncHandler<T = any>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
