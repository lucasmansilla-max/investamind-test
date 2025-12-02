/**
 * Authentication and Authorization Middlewares
 * Handles session validation and role-based access control
 */

import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import type { User } from "@shared/schema";
import {
  isAdmin,
  hasPremiumAccess,
  canCreateTradingAlerts,
  canViewTradingAlerts,
  canAccessCourses,
} from "../utils/roles";

// Session storage (temporary until centralized)
const sessions = new Map<string, { userId: number; email: string }>();

// Make sessions globally available for modules (temporary until session management is centralized)
(global as any).__sessions = sessions;

// Extend Express Request type to include user and session
declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: { userId: number; email: string };
    }
  }
}

/**
 * Get session from request
 */
export function getSession(req: Request): { userId: number; email: string } | null {
  const sessionId = req.cookies?.sessionId;
  if (!sessionId) return null;
  return sessions.get(sessionId) || null;
}

/**
 * Require authentication middleware
 * Validates session and sets req.user
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessionId = req.cookies?.sessionId;
    if (!sessionId) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const session = sessions.get(sessionId);
    if (!session) {
      res.status(401).json({ message: "Invalid session" });
      return;
    }

    const user = await storage.getUser(session.userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    req.user = user;
    req.session = session;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

/**
 * Optional authentication middleware
 * Sets req.user if session exists, but doesn't require it
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessionId = req.cookies?.sessionId;
    if (sessionId) {
      const session = sessions.get(sessionId);
      if (session) {
        const user = await storage.getUser(session.userId);
        if (user) {
          req.user = user;
          req.session = session;
        }
      }
    }
    next();
  } catch (error) {
    // Don't fail on optional auth errors, just continue
    next();
  }
}

/**
 * Require admin role middleware
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  if (!isAdmin(req.user)) {
    res.status(403).json({ message: "Forbidden: Admin access required" });
    return;
  }

  next();
}

/**
 * Require premium access middleware
 */
export function requirePremium(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  if (!hasPremiumAccess(req.user)) {
    res.status(403).json({
      message: "Premium subscription required",
      requiresUpgrade: true,
    });
    return;
  }

  next();
}

/**
 * Require ability to create trading alerts
 */
export function requireTradingAlerts(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  if (!canCreateTradingAlerts(req.user)) {
    res.status(403).json({
      message: "Premium subscription required to create trading alerts",
      requiresUpgrade: true,
    });
    return;
  }

  next();
}

/**
 * Require ability to view trading alerts
 */
export function requireViewTradingAlerts(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  if (!canViewTradingAlerts(req.user)) {
    res.status(403).json({
      message: "Premium subscription required to view trading alerts",
      requiresUpgrade: true,
    });
    return;
  }

  next();
}

/**
 * Require ability to access courses
 */
export function requireCourses(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  if (!canAccessCourses(req.user)) {
    res.status(403).json({
      message: "Premium subscription required to access courses",
      requiresUpgrade: true,
    });
    return;
  }

  next();
}

// Export sessions for use in other modules (temporary)
export { sessions };

