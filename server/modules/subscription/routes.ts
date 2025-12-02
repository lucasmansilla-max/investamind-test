/**
 * Subscription Routes
 */

import { Router } from "express";
import { asyncHandler } from "../../middlewares/error";
import { requireAuth, requireAdmin } from "../../middlewares/auth";
import {
  getSubscriptionStatus,
  createTrial,
  upgradeSubscription,
  cancelSubscription,
  getBillingHistory,
} from "../../services/subscriptionService";
import { storage } from "../../storage";
import { canAccessCourses, canViewTradingAlerts, hasPremiumAccess } from "../../utils/roles";

const router = Router();

/**
 * Get subscription status
 */
router.get(
  "/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const status = await getSubscriptionStatus(req.user.id);
    res.json(status);
  })
);

/**
 * Create trial subscription
 */
router.post(
  "/create-trial",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const subscription = await createTrial(req.user.id);
    res.status(201).json({
      subscription,
      message: "Trial started successfully",
    });
  })
);

/**
 * Upgrade subscription
 */
router.post(
  "/upgrade",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { planType } = req.body; // 'premium_monthly' or 'premium_yearly'
    if (!planType || (planType !== "premium_monthly" && planType !== "premium_yearly")) {
      return res.status(400).json({ message: "Invalid plan type" });
    }

    const subscription = await upgradeSubscription(req.user.id, planType);
    res.json({
      subscription,
      message: "Subscription upgraded successfully",
    });
  })
);

/**
 * Cancel subscription
 */
router.post(
  "/cancel",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const subscription = await cancelSubscription(req.user.id);
    res.json({
      subscription,
      message: "Subscription canceled successfully",
    });
  })
);

/**
 * Get billing history
 */
router.get(
  "/billing-history",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const history = await getBillingHistory(req.user.id);
    res.json(history);
  })
);


/**
 * Admin: Grant beta access
 */
router.post(
  "/admin/beta-users/grant-access",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { userId } = req.body;

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await storage.updateUser(userId, {
      isBetaUser: true,
      betaStartDate: new Date(),
      subscriptionStatus: "premium",
    });

    res.json({ message: "Beta access granted successfully" });
  })
);

/**
 * Admin: Get all subscriptions
 */
router.get(
  "/admin/subscriptions",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    // This would require admin role check in a real implementation
    const allUsers = Array.from((storage as any).users?.values() || []);
    const allSubscriptions = Array.from(
      (storage as any).subscriptions?.values() || []
    );

    const subscriptionData = allUsers.map((user: any) => {
      const subscription = allSubscriptions.find(
        (sub: any) => sub.userId === user.id
      );
      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isBetaUser: user.isBetaUser,
          subscriptionStatus: user.subscriptionStatus,
        },
        subscription: subscription || null,
      };
    });

    res.json({ subscriptions: subscriptionData });
  })
);

export default router;

