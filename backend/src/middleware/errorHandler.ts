// Centralized error handling middleware
// Per CLAUDE.md: all API responses use format { data?, error? }

import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/index';

// Centralized error handler for all routes
export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', error.message, error.stack);

  // Default error response
  const response: ApiResponse<never> = {
    error: error.message || 'Internal server error'
  };

  res.status(500).json(response);
}

// Middleware to catch async errors in route handlers
// Wrap async route handlers with this to catch promise rejections
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
