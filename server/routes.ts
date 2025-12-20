/**
 * Main Routes Registration
 * Registers all route modules and legacy endpoints
 */

import type { Express } from "express";
import { createServer, type Server } from "http";
import { asyncHandler } from "./middlewares/error";
import { requireAuth, requirePremium } from "./middlewares/auth";
import { storage } from "./storage";
import { insertUserProgressSchema, insertNotificationSchema } from "@shared/schema";
import { loadPosts, savePosts, type Post } from "./postsStore";

// Import route modules
import postsRouter from "./modules/posts/routes";
import searchRouter from "./modules/search/routes";
import usersRouter from "./modules/users/routes";
import notificationsRouter from "./modules/notifications/routes";
import commentsRouter from "./modules/comments/routes";
import blockingRouter from "./modules/blocking/routes";
import draftsRouter from "./modules/drafts/routes";
import authRouter from "./modules/auth/routes";
import subscriptionRouter from "./modules/subscription/routes";
import modulesRouter from "./modules/modules/routes";
import communityRouter from "./modules/community/routes";
import revenueCatRouter from "./modules/revenuecat/routes";
import uploadsRouter from "./modules/uploads/routes";
import adminRouter from "./modules/admin/routes";
import storiesRouter from "./modules/stories/routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Legacy endpoints for mobile app (Vibecode) - kept for backward compatibility
  // Restricted to premium users only
  app.get("/posts", requireAuth, requirePremium, (req, res) => {
    try {
      const posts = loadPosts();
      // Sort by createdAt descending (newest first)
      const sortedPosts = posts.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      res.json({ posts: sortedPosts });
    } catch (error) {
      console.error("Error loading posts:", error);
      res.status(500).json({ message: "Failed to load posts" });
    }
  });

  app.post("/posts", requireAuth, requirePremium, (req, res) => {
    try {
      const body = req.body;

      // Validate required fields
      if (!body.type || !body.content) {
        return res
          .status(400)
          .json({ message: "Missing required fields: type and content" });
      }

      // Type-specific validation
      if (body.type === "trading_signal") {
        if (!body.ticker || !body.signalType || !body.entryPrice) {
          return res.status(400).json({
            message: "Trading signal requires: ticker, signalType, entryPrice",
          });
        }
      } else if (body.type === "price_prediction") {
        if (
          !body.ticker ||
          !body.predictedPrice ||
          !body.timeFrame ||
          !body.confidenceLevel
        ) {
          return res.status(400).json({
            message:
              "Price prediction requires: ticker, predictedPrice, timeFrame, confidenceLevel",
          });
        }
      } else if (body.type === "win") {
        if (!body.resultType || !body.valueKind || !body.resultValue) {
          return res.status(400).json({
            message: "Win post requires: resultType, valueKind, resultValue",
          });
        }
      }

      // Generate unique ID
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Construct new post
      const newPost: Post = {
        id,
        createdAt: new Date().toISOString(),
        author: {
          name: "You",
          handle: "@you",
          avatarInitials: "U",
        },
        type: body.type,
        content: body.content || "",
        // Copy all optional fields transparently
        ticker: body.ticker,
        signalType: body.signalType,
        entryPrice: body.entryPrice,
        targetPrice: body.targetPrice,
        stopLoss: body.stopLoss,
        timeFrame: body.timeFrame,
        predictedPrice: body.predictedPrice,
        confidenceLevel: body.confidenceLevel,
        analysisType: body.analysisType,
        resultType: body.resultType,
        valueKind: body.valueKind,
        resultValue: body.resultValue,
      };

      // Load existing posts, add new one to the front, and save
      const posts = loadPosts();
      posts.unshift(newPost);
      savePosts(posts);

      res.status(201).json({ post: newPost });
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  // User progress routes
  app.get("/api/progress", asyncHandler(async (req, res) => {
    const sessionId = req.cookies?.sessionId;
    if (!sessionId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const sessions = (global as any).__sessions;
    if (!sessions) {
      return res.status(401).json({ message: "Invalid session" });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(401).json({ message: "Invalid session" });
    }

    const progress = await storage.getUserProgress(session.userId);
    res.json(progress);
  }));

  app.post("/api/progress", asyncHandler(async (req, res) => {
    const sessionId = req.cookies?.sessionId;
    if (!sessionId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const sessions = (global as any).__sessions;
    if (!sessions) {
      return res.status(401).json({ message: "Invalid session" });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(401).json({ message: "Invalid session" });
    }

    const progressData = insertUserProgressSchema.parse({
      ...req.body,
      userId: session.userId,
    });

    const progress = await storage.updateProgress(progressData);
    res.json(progress);
  }));

  // Get video progress summary endpoint (must be before :videoId to avoid route conflict)
  app.get("/api/progress/video/summary", asyncHandler(async (req, res) => {
    const sessionId = req.cookies?.sessionId;
    if (!sessionId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const sessions = (global as any).__sessions;
    if (!sessions) {
      return res.status(401).json({ message: "Invalid session" });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(401).json({ message: "Invalid session" });
    }

    const summary = await storage.getUserVideoProgressSummary(session.userId);
    res.json(summary);
  }));

  // Get video progress endpoint
  app.get("/api/progress/video/:videoId", asyncHandler(async (req, res) => {
    const sessionId = req.cookies?.sessionId;
    if (!sessionId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const sessions = (global as any).__sessions;
    if (!sessions) {
      return res.status(401).json({ message: "Invalid session" });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(401).json({ message: "Invalid session" });
    }

    const videoId = parseInt(req.params.videoId);
    if (isNaN(videoId)) {
      return res.status(400).json({ message: "Invalid video ID" });
    }

    const progress = await storage.getUserVideoProgress(session.userId, videoId);
    res.json(progress || null);
  }));

  // Video progress tracking endpoint
  app.post("/api/progress/video", asyncHandler(async (req, res) => {
    const sessionId = req.cookies?.sessionId;
    if (!sessionId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const sessions = (global as any).__sessions;
    if (!sessions) {
      return res.status(401).json({ message: "Invalid session" });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(401).json({ message: "Invalid session" });
    }

    const { videoId, watchedSeconds, totalSeconds, percentage, completed } = req.body;

    if (!videoId || typeof watchedSeconds !== 'number' || typeof totalSeconds !== 'number' || typeof percentage !== 'number') {
      return res.status(400).json({ message: "Invalid request data" });
    }

    // Get existing progress or create new
    const existingProgress = await storage.getUserVideoProgress(session.userId, videoId);
    
    // Ensure percentage doesn't exceed 100%
    const validPercentage = Math.min(Math.max(percentage, 0), 100);
    // Ensure watchedSeconds doesn't exceed totalSeconds
    const validWatchedSeconds = Math.min(Math.max(watchedSeconds, 0), totalSeconds);
    
    const progressData = {
      userId: session.userId,
      videoId,
      watchedSeconds: Math.max(validWatchedSeconds, existingProgress?.watchedSeconds || 0),
      totalSeconds: totalSeconds,
      completionPercentage: Math.min(Math.max(validPercentage, existingProgress?.completionPercentage || 0), 100), // Cap at 100%
      completed: completed || false,
    };

    const progress = await storage.updateUserVideoProgress(progressData);
    res.json(progress);
  }));

  // Market recaps routes
  app.get("/api/market-recaps", asyncHandler(async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 3;
    const recaps = await storage.getRecentRecaps(limit);
    res.json(recaps);
  }));

  // Content access check endpoint
  app.get("/api/content/access-check", asyncHandler(async (req, res) => {
    const sessionId = req.cookies?.sessionId;
    if (!sessionId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const sessions = (global as any).__sessions;
    if (!sessions) {
      return res.status(401).json({ message: "Invalid session" });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(401).json({ message: "Invalid session" });
    }

    const { contentType } = req.query;
    const user = await storage.getUser(session.userId);
    const subscription = await storage.getUserSubscription(session.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Import role utilities
    const { hasPremiumAccess, canAccessCourses, canViewTradingAlerts } = await import("./utils/roles");

    let hasAccess = false;

    // Check access based on role
    if (
      contentType === "course" ||
      contentType === "module" ||
      (typeof contentType === "string" && contentType.includes("learning"))
    ) {
      hasAccess = canAccessCourses(user);
    } else if (contentType === "trading_alert" || contentType === "signal") {
      hasAccess = canViewTradingAlerts(user);
    } else {
      // For other content types, use premium access check
      hasAccess = hasPremiumAccess(user);

      // Free access to basic content
      if (
        !hasAccess &&
        (contentType === "basic_module_1" || contentType === "community_read")
      ) {
        hasAccess = true;
      }
    }

    res.json({
      hasAccess,
      subscriptionStatus: user.subscriptionStatus,
      role: user.role || "free",
      isBetaUser: user.isBetaUser,
      subscription: subscription || null,
    });
  }));

  // Register all route modules
  app.use("/api/auth", authRouter);
  app.use("/api/subscription", subscriptionRouter);
  app.use("/api/modules", modulesRouter);
  app.use("/api/community", communityRouter);
  app.use("/api/revenuecat", revenueCatRouter);
  app.use("/api/uploads", uploadsRouter);
  app.use("/api/posts", postsRouter);
  app.use("/api/search", searchRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/users", blockingRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/drafts", draftsRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/stories", storiesRouter);

  const httpServer = createServer(app);
  return httpServer;
}
