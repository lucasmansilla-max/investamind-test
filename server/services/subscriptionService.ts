/**
 * Subscription Service
 * Handles subscription business logic
 */

import { storage } from "../storage";
import type { User, Subscription } from "@shared/schema";

export interface SubscriptionStatus {
  subscriptionStatus: string;
  role: string;
  isBetaUser: boolean;
  subscription: Subscription | null;
}

/**
 * Get subscription status for a user
 */
export async function getSubscriptionStatus(
  userId: number
): Promise<SubscriptionStatus> {
  let user = await storage.getUser(userId);
  let subscription = await storage.getUserSubscription(userId);

  // Validate and update subscription status if expired
  if (subscription) {
    const now = new Date();
    const periodEnd = subscription.currentPeriodEnd
      ? new Date(subscription.currentPeriodEnd)
      : null;
    const trialEnd = subscription.trialEnd ? new Date(subscription.trialEnd) : null;

    // Check if subscription has expired
    const isExpired =
      (periodEnd && periodEnd < now) ||
      (trialEnd && trialEnd < now && subscription.status === "trial") ||
      (subscription.status === "past_due" && periodEnd && periodEnd < now);

    // If expired, update subscription and user status
    if (isExpired && subscription.status !== "canceled") {
      await storage.updateSubscription(subscription.id, {
        status: "canceled",
        canceledAt: now,
      });

      // Update user status only if not admin
      if (user?.role !== "admin") {
        await storage.updateUser(userId, {
          subscriptionStatus: "free",
          role: "free",
        });
        // Refresh user data
        user = await storage.getUser(userId);
      }

      // Refresh subscription data
      subscription = await storage.getUserSubscription(userId);
    }
  }

  return {
    subscriptionStatus: user?.subscriptionStatus || "free",
    role: user?.role || "free",
    isBetaUser: user?.isBetaUser || false,
    subscription: subscription || null,
  };
}

/**
 * Create a trial subscription
 */
export async function createTrial(userId: number): Promise<Subscription> {
  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Check if user already has a subscription
  const existingSubscription = await storage.getUserSubscription(userId);
  if (existingSubscription) {
    throw new Error("User already has a subscription");
  }

  const trialStart = new Date();
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 7); // 7-day trial

  const subscription = await storage.createSubscription({
    userId,
    planType: "premium_monthly",
    status: "trial",
    trialStart,
    trialEnd,
    founderDiscount: user.isBetaUser || false,
    discountPercent: user.isBetaUser ? 50 : 0,
  });

  // Update user subscription status and sync role
  // Solo actualizar role si el usuario no es admin (los admins mantienen su role)
  const currentUser = await storage.getUser(userId);
  const newRole = currentUser?.role === "admin" ? "admin" : "premium";
  await storage.updateUser(userId, {
    subscriptionStatus: "trial",
    role: newRole,
  });

  return subscription;
}

/**
 * Upgrade subscription
 */
export async function upgradeSubscription(
  userId: number,
  planType: "premium_monthly" | "premium_yearly"
): Promise<Subscription> {
  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const subscription = await storage.getUserSubscription(userId);
  if (!subscription) {
    throw new Error("No subscription found");
  }

  const currentPeriodStart = new Date();
  const currentPeriodEnd = new Date();

  if (planType === "premium_yearly") {
    currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
  } else {
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
  }

  const updatedSubscription = await storage.updateSubscription(subscription.id, {
    planType,
    status: "active",
    currentPeriodStart,
    currentPeriodEnd,
  });

  // Update user subscription status and sync role
  // Solo actualizar role si el usuario no es admin (los admins mantienen su role)
  const currentUser = await storage.getUser(userId);
  const newRole = currentUser?.role === "admin" ? "admin" : "premium";
  await storage.updateUser(userId, {
    subscriptionStatus: "premium",
    role: newRole,
  });

  // Add to subscription history
  await storage.addSubscriptionHistory({
    subscriptionId: subscription.id,
    action: subscription.planType === planType ? "renewed" : "upgraded",
    fromPlan: subscription.planType,
    toPlan: planType,
    effectiveDate: currentPeriodStart,
    notes: `Upgraded to ${planType}`,
  });

  return updatedSubscription;
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(userId: number): Promise<Subscription> {
  const subscription = await storage.getUserSubscription(userId);
  if (!subscription) {
    throw new Error("No subscription found");
  }

  const updatedSubscription = await storage.updateSubscription(subscription.id, {
    status: "canceled",
    canceledAt: new Date(),
  });

  // Add to subscription history
  await storage.addSubscriptionHistory({
    subscriptionId: subscription.id,
    action: "canceled",
    fromPlan: subscription.planType,
    toPlan: null,
    effectiveDate: new Date(),
    notes: "Subscription canceled by user",
  });

  return updatedSubscription;
}

/**
 * Get billing history
 */
export async function getBillingHistory(userId: number) {
  const subscription = await storage.getUserSubscription(userId);
  if (!subscription) {
    return { payments: [] };
  }

  const payments = await storage.getPaymentHistory(subscription.id);
  return { payments };
}

