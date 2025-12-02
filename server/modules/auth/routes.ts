/**
 * Authentication Routes
 */

import { Router } from "express";
import { asyncHandler } from "../../middlewares/error";
import { requireAuth } from "../../middlewares/auth";
import {
  signup,
  signin,
  signout,
  requestPasswordReset,
  resetPassword,
} from "../../services/authService";
import { storage } from "../../storage";
import { sessions } from "../../middlewares/auth";
import {
  signupSchema,
  signinSchema,
  resetPasswordSchema,
  updateUserSchema,
  validateRequest,
} from "../../utils/validation";
import { z } from "zod";

const router = Router();

/**
 * Sign up a new user
 */
router.post(
  "/signup",
  validateRequest(signupSchema),
  asyncHandler(async (req, res) => {
    const result = await signup(req.body);
    res.cookie("sessionId", result.sessionId, { httpOnly: true });
    res.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        selectedLanguage: result.user.selectedLanguage,
      },
    });
  })
);

/**
 * Sign in an existing user
 */
router.post(
  "/signin",
  validateRequest(signinSchema),
  asyncHandler(async (req, res) => {
    const result = await signin(req.body);
    res.cookie("sessionId", result.sessionId, { httpOnly: true });
    res.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        selectedLanguage: result.user.selectedLanguage,
      },
    });
  })
);

/**
 * Sign out current user
 */
router.post(
  "/signout",
  asyncHandler(async (req, res) => {
    const sessionId = req.cookies?.sessionId;
    if (sessionId) {
      signout(sessionId);
    }
    res.clearCookie("sessionId");
    res.json({ message: "Signed out successfully" });
  })
);

/**
 * Logout (alternative endpoint)
 */
router.get(
  "/logout",
  asyncHandler(async (req, res) => {
    const sessionId = req.cookies?.sessionId;
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.clearCookie("sessionId", {
      httpOnly: true,
      path: "/",
      expires: new Date(0),
    });
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.status(200).json({ message: "Logged out successfully" });
  })
);

/**
 * Get current user
 */
router.get(
  "/user",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    if (!req.user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        selectedLanguage: req.user.selectedLanguage,
        experienceLevel: req.user.experienceLevel,
        investmentStyle: req.user.investmentStyle,
        onboardingCompleted: req.user.onboardingCompleted,
        username: req.user.username,
        bio: req.user.bio,
        avatarUrl: req.user.avatarUrl,
        role: req.user.role || "free",
      },
    });
  })
);

/**
 * Update current user
 */
router.patch(
  "/user",
  requireAuth,
  validateRequest(updateUserSchema),
  asyncHandler(async (req, res) => {
    if (!req.user || !req.session) {
      return res.status(401).json({ 
        message: "Debes iniciar sesión para actualizar tu perfil.",
        code: "AUTHENTICATION_REQUIRED"
      });
    }

    // Extract allowed fields from request body (already validated and sanitized)
    const allowedFields = [
      "username",
      "firstName",
      "lastName",
      "bio",
      "avatarUrl",
      "selectedLanguage",
      "experienceLevel",
      "investmentStyle",
    ];

    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Check if username is already taken
    if (updates.username !== undefined && updates.username) {
      const existingUser = await storage.getUserByUsername?.(updates.username);
      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(400).json({ 
          message: "Este nombre de usuario ya está en uso. Por favor, elige otro.",
          code: "USERNAME_TAKEN"
        });
      }
    }

    // Update user
    const updatedUser = await storage.updateUser(req.user.id, updates);

    res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        selectedLanguage: updatedUser.selectedLanguage,
        experienceLevel: updatedUser.experienceLevel,
        investmentStyle: updatedUser.investmentStyle,
        onboardingCompleted: updatedUser.onboardingCompleted,
        username: updatedUser.username,
        bio: updatedUser.bio,
        avatarUrl: updatedUser.avatarUrl,
      },
    });
  })
);

/**
 * Update experience level
 */
router.patch(
  "/update-experience",
  requireAuth,
  validateRequest(z.object({
    experienceLevel: z.enum(['beginner', 'intermediate', 'advanced'], {
      errorMap: () => ({ message: 'El nivel de experiencia debe ser: beginner, intermediate o advanced' }),
    }),
  })),
  asyncHandler(async (req, res) => {
    if (!req.user || !req.session) {
      return res.status(401).json({ 
        message: "Debes iniciar sesión para actualizar tu nivel de experiencia.",
        code: "AUTHENTICATION_REQUIRED"
      });
    }

    const { experienceLevel } = req.body;

    const updatedUser = await storage.updateUser(req.user.id, {
      experienceLevel,
    });

    res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        selectedLanguage: updatedUser.selectedLanguage,
        experienceLevel: updatedUser.experienceLevel,
      },
    });
  })
);

/**
 * Update investment style
 */
router.patch(
  "/update-investment-style",
  requireAuth,
  validateRequest(z.object({
    investmentStyle: z.enum(['conservative', 'moderate', 'aggressive'], {
      errorMap: () => ({ message: 'El estilo de inversión debe ser: conservative, moderate o aggressive' }),
    }),
  })),
  asyncHandler(async (req, res) => {
    if (!req.user || !req.session) {
      return res.status(401).json({ 
        message: "Debes iniciar sesión para actualizar tu estilo de inversión.",
        code: "AUTHENTICATION_REQUIRED"
      });
    }

    const { investmentStyle } = req.body;

    const updatedUser = await storage.updateUser(req.user.id, {
      investmentStyle,
      onboardingCompleted: true,
    });

    res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        selectedLanguage: updatedUser.selectedLanguage,
        experienceLevel: updatedUser.experienceLevel,
        investmentStyle: updatedUser.investmentStyle,
        onboardingCompleted: updatedUser.onboardingCompleted,
      },
    });
  })
);

/**
 * Request password reset
 */
router.post(
  "/forgot-password",
  validateRequest(z.object({
    email: z.string().email('El email proporcionado no es válido'),
  })),
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    try {
      await requestPasswordReset(email, req.protocol, req.get("host") || "");
    } catch (error: any) {
      // Always return success to prevent email enumeration
      if (error.message !== "Email is required") {
        console.error("Password reset error:", error);
      }
    }

    // Always return success message (security best practice)
    res.json({
      message:
        "Si existe una cuenta con ese email, se ha enviado un enlace para restablecer la contraseña.",
    });
  })
);

/**
 * Reset password with token
 */
router.post(
  "/reset-password",
  validateRequest(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;
    await resetPassword(token, newPassword);
    res.json({
      message: "La contraseña ha sido restablecida exitosamente",
    });
  })
);

export default router;

