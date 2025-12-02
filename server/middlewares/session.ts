/**
 * Session middleware
 * Reads session cookie and can be extended to set req.user
 * 
 * Note: Currently session validation is handled in routes.ts
 * This middleware is a placeholder for future enhancement
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Session middleware - currently a passthrough
 * Session validation is handled in individual routes
 * Can be enhanced to validate sessions globally once session management is centralized
 */
export async function sessionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Currently a passthrough - sessions are validated in routes.ts
  // TODO: Centralize session management and validate here
  next();
}

/**
 * Require authentication middleware
 * Returns 401 if user is not authenticated
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }
  next();
}

/**
 * Require specific role middleware
 */
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }
    
    if (req.user.role !== role) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }
    
    next();
  };
}
