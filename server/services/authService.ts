/**
 * Authentication Service
 * Handles authentication business logic
 */

import bcrypt from "bcrypt";
import crypto from "crypto";
import { storage } from "../storage";
import { insertUserSchema } from "@shared/schema";
import type { User } from "@shared/schema";
import { sessions } from "../middlewares/auth";
import { emailService } from "./emailService";

export interface AuthResult {
  user: Omit<User, "password">;
  sessionId: string;
}

export interface SignupData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  selectedLanguage?: string;
}

export interface SigninData {
  email: string;
  password: string;
}

/**
 * Create a new user account
 */
export async function signup(data: SignupData): Promise<AuthResult> {
  const userData = insertUserSchema.parse(data);

  // Check if user already exists
  const existingUser = await storage.getUserByEmail(userData.email);
  if (existingUser) {
    throw new Error("User already exists");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(userData.password, 10);

  const user = await storage.createUser({
    ...userData,
    password: hashedPassword,
  });

  // Create session
  const sessionId = crypto.randomBytes(32).toString("hex");
  sessions.set(sessionId, { userId: user.id, email: user.email });

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    sessionId,
  };
}

/**
 * Sign in an existing user
 */
export async function signin(data: SigninData): Promise<AuthResult> {
  const { email, password } = data;

  const user = await storage.getUserByEmail(email);
  if (!user) {
    throw new Error("Invalid credentials");
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    throw new Error("Invalid credentials");
  }

  // Create session
  const sessionId = crypto.randomBytes(32).toString("hex");
  sessions.set(sessionId, { userId: user.id, email: user.email });

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    sessionId,
  };
}

/**
 * Sign out a user
 */
export function signout(sessionId: string): void {
  sessions.delete(sessionId);
}

/**
 * Request password reset
 */
export async function requestPasswordReset(
  email: string,
  protocol: string,
  host: string
): Promise<void> {
  if (!email || typeof email !== "string") {
    throw new Error("Email is required");
  }

  const user = await storage.getUserByEmail(email);
  if (!user) {
    // Always return success to prevent email enumeration attacks
    return;
  }

  // Generate secure token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

  // Save token to database
  await storage.createPasswordResetToken(user.id, token, expiresAt);

  // Build reset URLs - deeplink para app móvil y web URL como fallback
  const deeplinkUrl = `investamind:///reset-password?token=${encodeURIComponent(token)}`;
  const webUrl = `${protocol}://${host}/reset-password?token=${encodeURIComponent(token)}`;
  const resetUrl = deeplinkUrl;

  // Get user's preferred language (default to 'en' if not set)
  const userLanguage = (user.selectedLanguage || "en") as "en" | "es";

  // Send password reset email
  try {
    await emailService.sendPasswordResetEmail(
      user.email,
      token,
      resetUrl,
      webUrl,
      userLanguage
    );
  } catch (emailError: any) {
    console.error("Error enviando email de recuperación:", emailError);
    // En desarrollo, aún mostrar el link en consola si el email falla
    if (process.env.NODE_ENV === "development") {
      console.log(`\n📧 Token de recuperación para ${email}: ${token}`);
      console.log(`Link de recuperación: ${resetUrl}\n`);
    }
    // No fallar la petición si el email falla - mejor práctica de seguridad
  }
}

/**
 * Reset password with token
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<void> {
  if (!token || typeof token !== "string") {
    throw new Error("Token is required");
  }

  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
    throw new Error("Password is required and must be at least 6 characters long");
  }

  // Find valid token
  const resetToken = await storage.getPasswordResetToken(token);
  if (!resetToken) {
    throw new Error("Invalid or expired token");
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update user password
  await storage.updateUserPassword(resetToken.userId, hashedPassword);

  // Invalidate token
  await storage.invalidatePasswordResetToken(token);
}

