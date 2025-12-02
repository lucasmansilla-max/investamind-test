/**
 * Admin Routes
 * Handles admin-only endpoints for system management
 */

import { Router } from "express";
import { asyncHandler } from "../../middlewares/error";
import { requireAuth, requireAdmin } from "../../middlewares/auth";
import { storage } from "../../storage";

const router = Router();

/**
 * Get all webhook logs (admin only)
 */
router.get(
  "/webhook-logs",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const source = req.query.source as string | undefined;
    const status = req.query.status as string | undefined;

    const logs = await storage.getWebhookLogs({
      limit,
      offset,
      source,
      status,
    });

    res.json({ logs });
  })
);

/**
 * Get a specific webhook log by ID (admin only)
 */
router.get(
  "/webhook-logs/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid log ID" });
    }

    const log = await storage.getWebhookLog(id);
    if (!log) {
      return res.status(404).json({ error: "Log not found" });
    }

    res.json({ log });
  })
);

/**
 * Get all users (admin only)
 */
router.get(
  "/users",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    // This is a placeholder - you may need to implement getAllUsers in storage
    // For now, we'll return an empty array or implement a basic version
    res.json([]);
  })
);

export default router;

