/**
 * RevenueCat Service
 * Handles RevenueCat webhook and sync logic
 */

import { storage } from "../storage";
import type { User, Subscription } from "@shared/schema";
import crypto from "crypto";
import { env } from "../config/env";

export interface RevenueCatEvent {
  type: string;
  app_user_id: string;
  product_id?: string;
  entitlement_id?: string;
  subscription_id?: string;
  store_transaction_id?: string;
  period_start_ms?: number;
  period_end_ms?: number;
  trial_start_ms?: number;
  trial_end_ms?: number;
  cancellation_date_ms?: number;
  id?: string;
  event_id?: string;
  eventId?: string;
  [key: string]: any; // Allow additional fields
}

export interface RevenueCatSyncData {
  entitlements?: {
    active?: Record<string, any>;
  };
  activeSubscriptions?: Record<string, any>;
}

/**
 * Determine plan type from product identifier
 */
function getPlanType(productId: string): "premium_monthly" | "premium_yearly" {
  if (productId.includes("yearly") || productId.includes("annual")) {
    return "premium_yearly";
  }
  return "premium_monthly";
}

/**
 * Calculate period end date
 */
function calculatePeriodEnd(
  periodStart: Date,
  planType: "premium_monthly" | "premium_yearly"
): Date {
  const periodEnd = new Date(periodStart);
  if (planType === "premium_yearly") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }
  return periodEnd;
}

/**
 * Validate and calculate period end
 */
function validatePeriodEnd(
  periodStart: Date,
  periodEnd: Date | null,
  planType: "premium_monthly" | "premium_yearly"
): Date {
  if (!periodEnd) {
    return calculatePeriodEnd(periodStart, planType);
  }

  const timeDiff = periodEnd.getTime() - periodStart.getTime();
  const isValid =
    periodEnd.getTime() > periodStart.getTime() &&
    timeDiff >= 24 * 60 * 60 * 1000; // At least 1 day

  if (!isValid) {
    return calculatePeriodEnd(periodStart, planType);
  }

  return periodEnd;
}

/**
 * Validate RevenueCat webhook authorization
 * 
 * RevenueCat sends the Authorization header value you configure in the dashboard
 * as a simple token (not an HMAC signature). This function validates that the
 * received token matches the configured secret.
 * 
 * The Authorization header can come in two formats:
 * - "Bearer <token>" (if configured with "Bearer" prefix)
 * - "<token>" (if configured without "Bearer" prefix)
 */
/**
 * Extract or generate a unique event_id from RevenueCat webhook event
 * Tries to extract from common fields, otherwise generates a deterministic hash
 */
export function extractEventId(event: RevenueCatEvent | Record<string, any>): string | null {
  // Try to extract from common event_id fields
  if (event.id) {
    return String(event.id);
  }
  if (event.event_id) {
    return String(event.event_id);
  }
  if (event.eventId) {
    return String(event.eventId);
  }

  // Generate a deterministic event_id based on unique fields
  // Use combination of fields that uniquely identify the event
  const uniqueFields = {
    type: event.type,
    app_user_id: event.app_user_id,
    subscription_id: event.subscription_id,
    store_transaction_id: event.store_transaction_id,
    period_start_ms: event.period_start_ms,
    period_end_ms: event.period_end_ms,
    timestamp: event.period_start_ms || Date.now(),
  };

  // Create a hash of the unique fields to generate a deterministic ID
  const hashInput = JSON.stringify(uniqueFields);
  const hash = crypto.createHash('sha256').update(hashInput).digest('hex');
  
  // Return first 32 characters as event_id (shorter, still unique enough)
  return hash.substring(0, 32);
}

export function validateWebhookSignature(
  payload: string,
  receivedToken: string
): boolean {
  if (!env.REVENUECAT_WEBHOOK_SECRET) {
    // In development, allow webhooks without validation
    if (env.NODE_ENV === "development") {
      console.warn("⚠️  REVENUECAT_WEBHOOK_SECRET not configured - webhooks are not being validated");
      return true;
    }
    // In production, require secret
    console.error("❌ REVENUECAT_WEBHOOK_SECRET not configured in production - rejecting webhook");
    return false;
  }

  try {
    // Remove "Bearer " prefix if present
    const cleanReceivedToken = receivedToken.startsWith("Bearer ")
      ? receivedToken.substring(7)
      : receivedToken;
    
    // Compare the received token with the configured secret
    // Use timingSafeEqual to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(cleanReceivedToken),
      Buffer.from(env.REVENUECAT_WEBHOOK_SECRET)
    );
  } catch (error) {
    console.error("Error validating webhook authorization:", error);
    return false;
  }
}

/**
 * Handle RevenueCat webhook event
 */
export async function handleWebhookEvent(
  event: RevenueCatEvent
): Promise<{ userId: number; subscriptionId?: number }> {
  const appUserId = event.app_user_id;
  if (!appUserId) {
    throw new Error("Missing app user id in webhook payload");
  }

  const userId = Number.parseInt(String(appUserId), 10);
  if (Number.isNaN(userId)) {
    throw new Error("Invalid app user id");
  }

  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Extract event information
  const eventType = event.type;
  const productId = event.product_id || "";
  const revenueCatSubscriptionId =
    event.subscription_id || event.store_transaction_id || null;

  // Extract dates
  const periodStart = event.period_start_ms
    ? new Date(event.period_start_ms)
    : new Date();
  let periodEnd = event.period_end_ms ? new Date(event.period_end_ms) : null;
  const trialStart = event.trial_start_ms
    ? new Date(event.trial_start_ms)
    : null;
  const trialEnd = event.trial_end_ms ? new Date(event.trial_end_ms) : null;
  const canceledAt = event.cancellation_date_ms
    ? new Date(event.cancellation_date_ms)
    : null;

  // Determine plan type
  const planType = getPlanType(productId);

  // Validate and calculate period end
  periodEnd = validatePeriodEnd(periodStart, periodEnd, planType);

  // Get or create subscription
  let subscription = await storage.getUserSubscription(userId);

  // Determine subscription status
  let subscriptionStatus = "active";
  if (
    eventType === "CANCELLATION" ||
    eventType === "SUBSCRIPTION_CANCELLED"
  ) {
    subscriptionStatus = "canceled";
  } else if (
    eventType === "EXPIRATION" ||
    eventType === "SUBSCRIPTION_EXPIRED"
  ) {
    subscriptionStatus = "past_due";
  } else if (trialStart && trialEnd && new Date() < trialEnd) {
    subscriptionStatus = "trial";
  }

  // Handle different event types
  if (
    eventType === "INITIAL_PURCHASE" ||
    eventType === "RENEWAL" ||
    eventType === "UNCANCELLATION" ||
    eventType === "SUBSCRIPTION_RENEWED" ||
    eventType === "SUBSCRIPTION_UNCANCELLED"
  ) {
    const currentUser = await storage.getUser(userId);
    const newRole = currentUser?.role === "admin" ? "admin" : "premium";

    if (subscription) {
      // Update existing subscription
      subscription = await storage.updateSubscription(subscription.id, {
        status: subscriptionStatus,
        planType: planType,
        revenueCatSubscriptionId: revenueCatSubscriptionId,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        trialStart: trialStart,
        trialEnd: trialEnd,
        canceledAt: null,
      });

      await storage.addSubscriptionHistory({
        subscriptionId: subscription.id,
        action:
          eventType === "INITIAL_PURCHASE" ? "created" : "renewed",
        fromPlan: subscription.planType,
        toPlan: planType,
        effectiveDate: new Date(),
        notes: `RevenueCat event: ${eventType}`,
      });
    } else {
      // Create new subscription
      subscription = await storage.createSubscription({
        userId: userId,
        planType: planType,
        status: subscriptionStatus,
        revenueCatSubscriptionId: revenueCatSubscriptionId,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        trialStart: trialStart,
        trialEnd: trialEnd,
        canceledAt: null,
        founderDiscount: user.isBetaUser || false,
        discountPercent: user.isBetaUser ? 50 : 0,
      });

      await storage.addSubscriptionHistory({
        subscriptionId: subscription.id,
        action: "created",
        fromPlan: null,
        toPlan: planType,
        effectiveDate: new Date(),
        notes: `RevenueCat initial purchase: ${eventType}`,
      });
    }

    // Update user
    await storage.updateUser(userId, {
      subscriptionStatus: "premium",
      role: newRole,
    });
  } else if (
    eventType === "CANCELLATION" ||
    eventType === "SUBSCRIPTION_CANCELLED"
  ) {
    const currentUser = await storage.getUser(userId);
    const newRole = currentUser?.role === "admin" ? "admin" : "free";

    if (subscription) {
      subscription = await storage.updateSubscription(subscription.id, {
        status: "canceled",
        canceledAt: canceledAt || new Date(),
        currentPeriodEnd: periodEnd || subscription.currentPeriodEnd,
      });

      await storage.addSubscriptionHistory({
        subscriptionId: subscription.id,
        action: "canceled",
        fromPlan: subscription.planType,
        toPlan: subscription.planType,
        effectiveDate: new Date(),
        notes: `RevenueCat cancellation: ${eventType}`,
      });
    }

    // Only update user if period has expired
    if (periodEnd && new Date(periodEnd) < new Date()) {
      await storage.updateUser(userId, {
        subscriptionStatus: "free",
        role: newRole,
      });
    }
  } else if (
    eventType === "EXPIRATION" ||
    eventType === "SUBSCRIPTION_EXPIRED"
  ) {
    const currentUser = await storage.getUser(userId);
    const newRole = currentUser?.role === "admin" ? "admin" : "free";

    if (subscription) {
      subscription = await storage.updateSubscription(subscription.id, {
        status: "past_due",
      });

      await storage.addSubscriptionHistory({
        subscriptionId: subscription.id,
        action: "expired",
        fromPlan: subscription.planType,
        toPlan: subscription.planType,
        effectiveDate: new Date(),
        notes: `RevenueCat expiration: ${eventType}`,
      });
    }

    // Update user to free
    await storage.updateUser(userId, {
      subscriptionStatus: "free",
      role: newRole,
    });
  }

  return {
    userId,
    subscriptionId: subscription?.id,
  };
}

/**
 * Sync subscription from RevenueCat CustomerInfo
 */
export async function syncFromCustomerInfo(
  userId: number,
  data: RevenueCatSyncData
): Promise<{ subscription: Subscription; role: string }> {
  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Check for active entitlement
  const ENTITLEMENT_NAME = "Investamind Pro";
  const entitlement = data.entitlements?.active?.[ENTITLEMENT_NAME];
  const hasActiveEntitlement = !!entitlement;

  if (!hasActiveEntitlement) {
    throw new Error("No active entitlement found");
  }

  // Extract information from entitlement
  const productIdentifier = entitlement.productIdentifier || "";
  const planType = getPlanType(productIdentifier);

  // Extract dates
  const purchaseDate = entitlement.latestPurchaseDate
    ? new Date(entitlement.latestPurchaseDate)
    : entitlement.purchaseDate
    ? new Date(entitlement.purchaseDate)
    : new Date();

  const expirationDate = entitlement.expirationDate
    ? new Date(entitlement.expirationDate)
    : null;

  const transactionIdentifier =
    entitlement.transactionIdentifier ||
    entitlement.originalTransactionIdentifier ||
    null;

  // Calculate period start and end
  const periodStart = purchaseDate;
  let periodEnd = expirationDate;

  // Validate and calculate period end
  periodEnd = validatePeriodEnd(periodStart, periodEnd, planType);

  // Get or create subscription
  let subscription = await storage.getUserSubscription(userId);
  const newRole = user.role === "admin" ? "admin" : "premium";

  if (subscription) {
    // Update existing subscription
    subscription = await storage.updateSubscription(subscription.id, {
      status: "active",
      planType: planType,
      revenueCatSubscriptionId:
        transactionIdentifier || subscription.revenueCatSubscriptionId,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      canceledAt: null,
    });
  } else {
    // Create new subscription
    subscription = await storage.createSubscription({
      userId: userId,
      planType: planType,
      status: "active",
      revenueCatSubscriptionId: transactionIdentifier || null,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      canceledAt: null,
      founderDiscount: user.isBetaUser || false,
      discountPercent: user.isBetaUser ? 50 : 0,
    });

    await storage.addSubscriptionHistory({
      subscriptionId: subscription.id,
      action: "created",
      fromPlan: null,
      toPlan: planType,
      effectiveDate: new Date(),
      notes: "Manual sync from RevenueCat after purchase",
    });
  }

  // Update user
  await storage.updateUser(userId, {
    subscriptionStatus: "premium",
    role: newRole,
  });

  return { subscription, role: newRole };
}

