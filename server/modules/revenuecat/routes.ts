/**
 * RevenueCat Routes
 */

import { Router } from "express";
import { asyncHandler } from "../../middlewares/error";
import { requireAuth } from "../../middlewares/auth";
import {
  handleWebhookEvent,
  syncFromCustomerInfo,
  validateWebhookSignature,
} from "../../services/revenueCatService";
import { storage } from "../../storage";

const router = Router();

/**
 * RevenueCat webhook endpoint
 */
router.post(
  "/webhook",
  asyncHandler(async (req, res) => {
    // RevenueCat sends signature in Authorization header as "Bearer <signature>"
    // or in X-RevenueCat-Signature header
    const authHeaderRaw = req.headers["authorization"];
    const signatureHeaderRaw = req.headers["x-revenuecat-signature"];
    
    // Convert headers to string (headers can be string | string[])
    const authHeader = Array.isArray(authHeaderRaw) 
      ? authHeaderRaw[0] || "" 
      : authHeaderRaw || "";
    const signatureHeader = Array.isArray(signatureHeaderRaw)
      ? signatureHeaderRaw[0] || ""
      : signatureHeaderRaw || "";
    
    // Extract signature from Authorization header if present
    let signature = signatureHeader;
    if (authHeader.startsWith("Bearer ")) {
      signature = authHeader.substring(7);
    } else if (authHeader) {
      signature = authHeader;
    }
    
    // Get raw body for signature validation
    const rawBody = JSON.stringify(req.body);
    
    // Validate webhook signature if secret is configured
    const isValid = validateWebhookSignature(rawBody, signature);
    
    // RevenueCat can send events in different formats:
    // Format 1: { event: { type: "...", ... } }
    // Format 2: { type: "...", ... } (direct event)
    const event = req.body.event || req.body;
    const eventType = event.type || "UNKNOWN";
    
    let webhookLog;
    let userId: number | null = null;
    let subscriptionId: number | null = null;
    
    // Helper function to safely create webhook log
    const createLogSafely = async (logData: {
      source: string;
      eventType: string;
      payload: any;
      userId: number | null;
      subscriptionId: number | null;
      status: string;
      errorMessage: string | null;
    }) => {
      try {
        return await storage.createWebhookLog({
          source: logData.source,
          eventType: logData.eventType,
          payload: logData.payload,
          userId: logData.userId,
          subscriptionId: logData.subscriptionId,
          status: logData.status,
          errorMessage: logData.errorMessage,
          processedAt: null,
        });
      } catch (logError: any) {
        // Try to create a minimal log entry as fallback
        try {
          const errorMessage = logError?.message || String(logError) || "Unknown error";
          return await storage.createWebhookLog({
            source: logData.source,
            eventType: logData.eventType || "UNKNOWN",
            payload: { 
              error: "Failed to save original payload", 
              originalError: errorMessage 
            } as Record<string, any>,
            userId: logData.userId,
            subscriptionId: logData.subscriptionId,
            status: "failed",
            errorMessage: `Failed to create log: ${errorMessage}`,
            processedAt: null,
          });
        } catch {
          return null;
        }
      }
    };
    
    try {
      // Extract user ID from event for logging
      if (event.app_user_id) {
        const parsedUserId = Number.parseInt(String(event.app_user_id), 10);
        if (!Number.isNaN(parsedUserId)) {
          userId = parsedUserId;
        }
      }
      
      // Create webhook log entry before processing
      // This ensures we always have a record of incoming webhooks
      webhookLog = await createLogSafely({
        source: "revenuecat",
        eventType: eventType,
        payload: event,
        userId: userId || null,
        subscriptionId: null,
        status: isValid ? "received" : "invalid",
        errorMessage: isValid ? null : "Invalid webhook signature",
      });
      
      // If signature is invalid, update log and return error
      if (!isValid) {
        if (webhookLog) {
          await storage.updateWebhookLogStatus(
            webhookLog.id,
            "invalid",
            "Invalid webhook signature"
          ).catch(() => {
            // Silently fail log update - webhook already rejected
          });
        }
        return res.status(401).json({
          success: false,
          error: "Invalid webhook signature",
        });
      }
      
      // Process the webhook event
      const result = await handleWebhookEvent(event);
      subscriptionId = result.subscriptionId || null;
      
      // Update log with success status and subscription ID
      if (webhookLog) {
        await storage.updateWebhookLogStatus(
          webhookLog.id, 
          "processed",
          undefined,
          subscriptionId || undefined
        ).catch(() => {
          // Silently fail log update - webhook already processed
        });
      }
      
      res.status(200).json({
        success: true,
        userId: result.userId,
        eventType: event.type,
        subscriptionId: result.subscriptionId,
      });
    } catch (error: any) {
      // Update log with error status
      if (webhookLog) {
        await storage.updateWebhookLogStatus(
          webhookLog.id,
          "failed",
          error.message || "Unknown error"
        ).catch(() => {
          // Silently fail log update
        });
      } else {
        // If we don't have a log, try to create one for the error
        await createLogSafely({
          source: "revenuecat",
          eventType: eventType,
          payload: event,
          userId: userId || null,
          subscriptionId: subscriptionId || null,
          status: "failed",
          errorMessage: error.message || "Unknown error",
        }).catch(() => {
          // Silently fail - error already logged
        });
      }
      
      console.error("Error processing RevenueCat webhook:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to process webhook",
      });
    }
  })
);

/**
 * Client sync endpoint (called from frontend after purchase)
 * Creates a webhook log entry for tracking subscription syncs
 */
router.post(
  "/sync",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { entitlements, activeSubscriptions } = req.body;
    const userId = req.user.id;
    
    // Check for recent duplicate sync logs (within last 5 seconds) to avoid duplicates
    let syncLog = null;
    try {
      const recentLogs = await storage.getWebhookLogs({
        limit: 5,
        source: "revenuecat",
      });
      
      const now = new Date();
      const hasRecentSync = recentLogs.some((log: any) => {
        if (log.eventType === "Subscription Sync" && log.userId === userId) {
          const logTime = new Date(log.createdAt);
          const timeDiff = now.getTime() - logTime.getTime();
          return timeDiff < 5000; // 5 seconds
        }
        return false;
      });
      
      // Only create a new log if there isn't a very recent one
      if (!hasRecentSync) {
        syncLog = await storage.createWebhookLog({
          source: "revenuecat",
          eventType: "Subscription Sync",
          payload: {
            entitlements,
            activeSubscriptions,
            userId: userId,
          } as Record<string, any>,
          userId: userId,
          subscriptionId: null,
          status: "received",
          errorMessage: null,
          processedAt: null,
        });
      } else {
        // Use the recent log instead
        const recentLog = recentLogs.find((log: any) => 
          log.eventType === "Subscription Sync" && log.userId === userId
        );
        if (recentLog) {
          syncLog = recentLog;
        }
      }
    } catch (logError: any) {
      // Continue even if log creation fails
    }

    try {
      const result = await syncFromCustomerInfo(userId, {
        entitlements,
        activeSubscriptions,
      });

      // Update log with success status
      if (syncLog) {
        await storage.updateWebhookLogStatus(
          syncLog.id,
          "processed",
          undefined,
          result.subscription?.id ? result.subscription.id : undefined
        ).catch(() => {
          // Silently fail log update
        });
      }

      res.status(200).json({
        success: true,
        subscription: result.subscription,
        role: result.role,
      });
    } catch (error: any) {
      // Update log with error status
      if (syncLog) {
        await storage.updateWebhookLogStatus(
          syncLog.id,
          "failed",
          error.message || "Unknown error"
        ).catch(() => {
          // Silently fail log update
        });
      }
      throw error; // Re-throw to be handled by asyncHandler
    }
  })
);

export default router;

