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
import {
  upgradeSubscriptionSchema,
  idParamSchema,
  validateRequest,
} from "../../utils/validation";
import { z } from "zod";

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
  validateRequest(upgradeSubscriptionSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: "Debes iniciar sesión para actualizar tu suscripción.",
        code: "AUTHENTICATION_REQUIRED"
      });
    }

    const { planType } = req.body;

    const subscription = await upgradeSubscription(req.user.id, planType);
    res.json({
      subscription,
      message: "Suscripción actualizada exitosamente",
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
  validateRequest(z.object({
    userId: z.number().int().positive('El ID de usuario debe ser un número positivo'),
  })),
  asyncHandler(async (req, res) => {
    const { userId } = req.body;

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ 
        message: "El usuario solicitado no fue encontrado.",
        code: "USER_NOT_FOUND"
      });
    }

    await storage.updateUser(userId, {
      isBetaUser: true,
      betaStartDate: new Date(),
      subscriptionStatus: "premium",
    });

    res.json({ message: "Acceso beta otorgado exitosamente" });
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

