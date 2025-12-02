/**
 * Centralized error handling middleware
 * Formats errors consistently across the application
 */

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { formatValidationErrors } from '../utils/validation';

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
  err: AppError | ZodError | Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const formatted = formatValidationErrors(err);
    return res.status(400).json({
      message: formatted.message,
      errors: formatted.errors,
      code: 'VALIDATION_ERROR',
    });
  }

  // Don't log errors in test environment
  if (process.env.NODE_ENV !== 'test') {
    console.error('Error occurred:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      code: (err as AppError).code,
    });
  }

  // Determine status code
  const status = (err as AppError).status || (err as AppError).statusCode || 500;
  
  // Determine error message with more descriptive defaults
  let message = err.message || 'Error interno del servidor';
  
  // Map common error messages to more descriptive ones
  if (status === 400 && !message.includes('requerido') && !message.includes('válido')) {
    if (message === 'Invalid request data' || message === 'Invalid request') {
      message = 'Los datos proporcionados no son válidos. Por favor, verifica los campos e intenta nuevamente.';
    } else if (message.includes('Invalid')) {
      message = `Datos inválidos: ${message}`;
    }
  } else if (status === 401) {
    if (message === 'Not authenticated' || message === 'Authentication required') {
      message = 'Debes iniciar sesión para acceder a este recurso.';
    } else if (message === 'Invalid session') {
      message = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
    }
  } else if (status === 403) {
    if (message === 'Forbidden' || message.includes('Forbidden')) {
      message = 'No tienes permisos para realizar esta acción.';
    }
  } else if (status === 404) {
    if (message === 'Not found' || message.includes('not found')) {
      message = 'El recurso solicitado no fue encontrado.';
    }
  } else if (status === 500) {
    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production') {
      message = 'Ocurrió un error interno del servidor. Por favor, intenta nuevamente más tarde.';
    } else {
      message = `Error interno: ${message}`;
    }
  }

  // Send error response
  res.status(status).json({
    message,
    ...((err as AppError).code && { code: (err as AppError).code }),
    ...((err as AppError).details && process.env.NODE_ENV !== 'production' && { details: (err as AppError).details }),
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
