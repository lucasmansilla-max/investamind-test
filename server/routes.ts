import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertUserProgressSchema, insertNotificationSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";
import { loadPosts, savePosts, type Post } from "./postsStore";
import { parsePaginationParams, buildPaginationResult } from "./utils/pagination";
import postsRouter from "./modules/posts/routes";
import searchRouter from "./modules/search/routes";
import usersRouter from "./modules/users/routes";
import notificationsRouter from "./modules/notifications/routes";
import commentsRouter from "./modules/comments/routes";
import blockingRouter from "./modules/blocking/routes";
import draftsRouter from "./modules/drafts/routes";

// Simple session storage for demo (in production, use proper session management)
const sessions = new Map<string, { userId: number; email: string }>();

// Make sessions globally available for modules (temporary until session management is centralized)
(global as any).__sessions = sessions;

// Language helper function
function reqLang(req: Request): string {
  const q = (req.query.lang || req.headers["accept-language"] || "en").toString().slice(0, 2);
  return q === "es" ? "es" : "en";
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Community posts endpoints for mobile app (Vibecode)
  app.get("/posts", (req, res) => {
    try {
      const posts = loadPosts();
      // Sort by createdAt descending (newest first)
      const sortedPosts = posts.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      res.json({ posts: sortedPosts });
    } catch (error) {
      console.error("Error loading posts:", error);
      res.status(500).json({ message: "Failed to load posts" });
    }
  });

  app.post("/posts", (req, res) => {
    try {
      const body = req.body;

      // Validate required fields
      if (!body.type || !body.content) {
        return res.status(400).json({ message: "Missing required fields: type and content" });
      }

      // Type-specific validation
      if (body.type === "trading_signal") {
        if (!body.ticker || !body.signalType || !body.entryPrice) {
          return res.status(400).json({ 
            message: "Trading signal requires: ticker, signalType, entryPrice" 
          });
        }
      } else if (body.type === "price_prediction") {
        if (!body.ticker || !body.predictedPrice || !body.timeFrame || !body.confidenceLevel) {
          return res.status(400).json({ 
            message: "Price prediction requires: ticker, predictedPrice, timeFrame, confidenceLevel" 
          });
        }
      } else if (body.type === "win") {
        if (!body.resultType || !body.valueKind || !body.resultValue) {
          return res.status(400).json({ 
            message: "Win post requires: resultType, valueKind, resultValue" 
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
          avatarInitials: "U"
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
  
  // Auth routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }
      
      // Hash password (in a real app, use proper password hashing)
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });
      
      // Create session
      const sessionId = Math.random().toString(36).substring(7);
      sessions.set(sessionId, { userId: user.id, email: user.email });
      
      res.cookie('sessionId', sessionId, { httpOnly: true });
      res.json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName,
          lastName: user.lastName,
          selectedLanguage: user.selectedLanguage 
        } 
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.post("/api/auth/signin", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Create session
      const sessionId = Math.random().toString(36).substring(7);
      sessions.set(sessionId, { userId: user.id, email: user.email });
      
      res.cookie('sessionId', sessionId, { httpOnly: true });
      res.json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName,
          lastName: user.lastName,
          selectedLanguage: user.selectedLanguage 
        } 
      });
    } catch (error) {
      console.error("Signin error:", error);
      res.status(400).json({ message: "Invalid credentials" });
    }
  });

  app.get("/api/auth/logout", (req, res) => {
    const sessionId = req.cookies?.sessionId;
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.clearCookie('sessionId', { 
      httpOnly: true, 
      path: '/',
      expires: new Date(0)
    });
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.status(200).json({ message: "Logged out successfully" });
  });

  app.get("/api/auth/user", async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      console.log("Auth check - cookies:", req.cookies);
      console.log("Auth check - sessionId:", req.cookies?.sessionId);
      console.log("Active sessions:", Array.from(sessions.keys()));
      
      const sessionId = req.cookies?.sessionId;
      if (!sessionId) {
        console.log("No session ID found in cookies");
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const session = sessions.get(sessionId);
      if (!session) {
        console.log("Invalid session ID:", sessionId);
        return res.status(401).json({ message: "Invalid session" });
      }
      
      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log("User from storage:", user);
      
      res.json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName,
          lastName: user.lastName,
          selectedLanguage: user.selectedLanguage,
          experienceLevel: user.experienceLevel,
          investmentStyle: user.investmentStyle,
          onboardingCompleted: user.onboardingCompleted,
          username: user.username,
          bio: user.bio,
          avatarUrl: user.avatarUrl
        } 
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/auth/user", async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      if (!sessionId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const session = sessions.get(sessionId);
      if (!session) {
        return res.status(401).json({ message: "Invalid session" });
      }
      
      // Extract allowed fields from request body
      const updates: Partial<User> = {};
      const allowedFields = ['username', 'firstName', 'lastName', 'bio', 'avatarUrl', 'selectedLanguage', 'experienceLevel', 'investmentStyle'];
      
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          (updates as any)[field] = req.body[field];
        }
      }
      
      // Validate username if provided
      if (updates.username !== undefined) {
        if (typeof updates.username !== 'string') {
          return res.status(400).json({ message: "Username must be a string" });
        }
        if (updates.username.length > 30) {
          return res.status(400).json({ message: "Username must be 30 characters or less" });
        }
        // Check if username is already taken
        if (updates.username) {
          const existingUser = await storage.getUserByUsername?.(updates.username);
          if (existingUser && existingUser.id !== session.userId) {
            return res.status(400).json({ message: "Username already taken" });
          }
        }
      }
      
      // Update user
      const updatedUser = await storage.updateUser(session.userId, updates);
      
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
          avatarUrl: updatedUser.avatarUrl
        } 
      });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/signout", (req, res) => {
    const sessionId = req.cookies?.sessionId;
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.clearCookie('sessionId');
    res.json({ message: "Signed out successfully" });
  });

  app.patch("/api/auth/update-experience", async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      if (!sessionId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const session = sessions.get(sessionId);
      if (!session) {
        return res.status(401).json({ message: "Invalid session" });
      }
      
      const { experienceLevel } = req.body;
      if (!experienceLevel) {
        return res.status(400).json({ message: "Experience level is required" });
      }
      
      // Update user experience level in storage
      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update the user with new experience level
      console.log("Updating user with experience level:", experienceLevel);
      const updatedUser = await storage.updateUser(session.userId, { 
        experienceLevel 
      });
      console.log("Updated user:", updatedUser);
      
      res.json({ 
        user: { 
          id: updatedUser.id, 
          email: updatedUser.email, 
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          selectedLanguage: updatedUser.selectedLanguage,
          experienceLevel: updatedUser.experienceLevel
        } 
      });
    } catch (error) {
      console.error("Update experience error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Update investment style endpoint
  app.patch("/api/auth/update-investment-style", async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      if (!sessionId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const session = sessions.get(sessionId);
      if (!session) {
        return res.status(401).json({ message: "Invalid session" });
      }
      
      const { investmentStyle } = req.body;
      if (!investmentStyle) {
        return res.status(400).json({ message: "Investment style is required" });
      }
      
      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updatedUser = await storage.updateUser(session.userId, { 
        investmentStyle,
        onboardingCompleted: true
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
          onboardingCompleted: updatedUser.onboardingCompleted
        } 
      });
    } catch (error) {
      console.error("Update investment style error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Learning modules routes
  app.get("/api/modules", async (req, res) => {
    try {
      const lang = reqLang(req);
      const modules = await storage.getAllModules();
      
      // Localize module content based on language
      const localizedModules = modules.map(m => ({
        ...m,
        title: lang === "es" && m.titleEs ? m.titleEs : m.title,
        description: lang === "es" && m.descriptionEs ? m.descriptionEs : m.description,
        content: lang === "es" && m.contentEs ? m.contentEs : m.content,
        quizQuestion: lang === "es" && m.quizQuestionEs ? m.quizQuestionEs : m.quizQuestion,
        quizOptions: lang === "es" && m.quizOptionsEs ? m.quizOptionsEs : m.quizOptions,
        correctAnswer: lang === "es" && m.correctAnswerEs ? m.correctAnswerEs : m.correctAnswer,
      }));
      
      res.json(localizedModules);
    } catch (error) {
      console.error("Get modules error:", error);
      res.status(500).json({ message: "Failed to fetch modules" });
    }
  });

  app.get("/api/modules/:id", async (req, res) => {
    try {
      const lang = reqLang(req);
      const moduleId = parseInt(req.params.id);
      const module = await storage.getModule(moduleId);
      
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }
      
      // Localize module content based on language
      const localizedModule = {
        ...module,
        title: lang === "es" && module.titleEs ? module.titleEs : module.title,
        description: lang === "es" && module.descriptionEs ? module.descriptionEs : module.description,
        content: lang === "es" && module.contentEs ? module.contentEs : module.content,
        quizQuestion: lang === "es" && module.quizQuestionEs ? module.quizQuestionEs : module.quizQuestion,
        quizOptions: lang === "es" && module.quizOptionsEs ? module.quizOptionsEs : module.quizOptions,
        correctAnswer: lang === "es" && module.correctAnswerEs ? module.correctAnswerEs : module.correctAnswer,
      };
      
      res.json(localizedModule);
    } catch (error) {
      console.error("Get module error:", error);
      res.status(500).json({ message: "Failed to fetch module" });
    }
  });

  // User progress routes
  app.get("/api/progress", async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      if (!sessionId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const session = sessions.get(sessionId);
      if (!session) {
        return res.status(401).json({ message: "Invalid session" });
      }
      
      const progress = await storage.getUserProgress(session.userId);
      res.json(progress);
    } catch (error) {
      console.error("Get progress error:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  app.post("/api/progress", async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      if (!sessionId) {
        return res.status(401).json({ message: "Not authenticated" });
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
    } catch (error) {
      console.error("Update progress error:", error);
      res.status(400).json({ message: "Invalid progress data" });
    }
  });

  // Market recaps routes
  app.get("/api/market-recaps", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 3;
      const recaps = await storage.getRecentRecaps(limit);
      res.json(recaps);
    } catch (error) {
      console.error("Get recaps error:", error);
      res.status(500).json({ message: "Failed to fetch market recaps" });
    }
  });

  // Notifications routes
  app.get("/api/notifications", async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      if (!sessionId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const session = sessions.get(sessionId);
      if (!session) {
        return res.status(401).json({ message: "Invalid session" });
      }
      
      const notifications = await storage.getUserNotifications(session.userId);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      if (!sessionId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const session = sessions.get(sessionId);
      if (!session) {
        return res.status(401).json({ message: "Invalid session" });
      }

      const notificationData = insertNotificationSchema.parse({
        ...req.body,
        userId: session.userId,
      });
      
      const notification = await storage.createNotification(notificationData);
      res.json(notification);
    } catch (error) {
      console.error("Create notification error:", error);
      res.status(400).json({ message: "Invalid notification data" });
    }
  });

  // Community API endpoints (with cursor pagination and block filtering)
  app.get("/api/community/posts", async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      if (!sessionId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const session = sessions.get(sessionId);
      if (!session) {
        return res.status(401).json({ message: "Invalid session" });
      }

      // Support optional pagination - if no cursor provided, return full feed (backward compatible)
      const usePagination = !!req.query.cursor || req.query.limit;
      
      let posts;
      if (usePagination) {
        const { cursor, limit } = parsePaginationParams(req.query);
        posts = await storage.getPostsPaginated({
          currentUserId: session.userId,
          cursor: cursor || undefined,
          limit,
        });
        // Build pagination result with proper typing
        const postsWithDates = posts.filter(p => p.createdAt !== null) as Array<{ createdAt: Date; id: number } & typeof posts[0]>;
        const paginationResult = buildPaginationResult(postsWithDates, limit);
        posts = paginationResult.data;
      } else {
        // Full feed mode - get all posts (legacy behavior)
        posts = await storage.getAllPosts();
      }
      
      // Add user information and interaction status to each post
      const postsWithUsers = await Promise.all(posts.map(async (post) => {
        const user = await storage.getUser(post.userId);
        const isLiked = await storage.isPostLiked(session.userId, post.id);
        const isReposted = await storage.isPostReposted(session.userId, post.id);
        return {
          ...post,
          user: user ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            currentBadge: "TRADER" // Default badge for now
          } : {
            id: post.userId,
            firstName: "Unknown",
            lastName: "User",
            currentBadge: "NEWBIE"
          },
          isLiked,
          isReposted,
          isBookmarked: false // Default for now
        };
      }));

      // Maintain backward compatibility: return array for now
      // TODO: Update frontend to handle pagination metadata
      res.json(postsWithUsers);
    } catch (error) {
      console.error("Get posts error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/community/posts", async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      if (!sessionId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const session = sessions.get(sessionId);
      if (!session) {
        return res.status(401).json({ message: "Invalid session" });
      }

      const { content } = req.body;
      
      if (!content || !content.trim()) {
        return res.status(400).json({ message: "Content is required" });
      }

      // Use the new posts service which handles hashtag/mention parsing and storage
      const { createPost } = await import('./modules/posts/service.js');
      const newPost = await createPost({
        userId: session.userId,
        body: content.trim(),
        imageUrl: req.body.imageUrl,
        io: req.app.io,
      });
      
      // Add user information to the response for backward compatibility
      const user = await storage.getUser(session.userId);
      const postWithUser = {
        ...newPost,
        user: user ? {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          currentBadge: "TRADER"
        } : {
          id: session.userId,
          firstName: "Unknown",
          lastName: "User",
          currentBadge: "NEWBIE"
        }
      };

      res.status(201).json(postWithUser);
    } catch (error) {
      console.error("Create post error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Like/Unlike post endpoints
  app.post("/api/community/posts/:postId/like", async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      if (!sessionId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const session = sessions.get(sessionId);
      if (!session) {
        return res.status(401).json({ message: "Invalid session" });
      }

      const postId = parseInt(req.params.postId);
      const isLiked = await storage.isPostLiked(session.userId, postId);
      
      if (isLiked) {
        await storage.unlikePost(session.userId, postId);
      } else {
        await storage.likePost(session.userId, postId);
      }

      res.json({ liked: !isLiked });
    } catch (error) {
      console.error("Like post error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get post like status
  app.get("/api/community/posts/:postId/like-status", async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      if (!sessionId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const session = sessions.get(sessionId);
      if (!session) {
        return res.status(401).json({ message: "Invalid session" });
      }

      const postId = parseInt(req.params.postId);
      const isLiked = await storage.isPostLiked(session.userId, postId);
      
      res.json({ liked: isLiked });
    } catch (error) {
      console.error("Get like status error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Repost/Unrepost post endpoints
  app.post("/api/community/posts/:postId/repost", async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      if (!sessionId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const session = sessions.get(sessionId);
      if (!session) {
        return res.status(401).json({ message: "Invalid session" });
      }

      const postId = parseInt(req.params.postId);
      const isReposted = await storage.isPostReposted(session.userId, postId);
      
      if (isReposted) {
        await storage.unrepostPost(session.userId, postId);
      } else {
        await storage.repostPost(session.userId, postId);
      }

      res.json({ reposted: !isReposted });
    } catch (error) {
      console.error("Repost error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Comment endpoints
  app.get("/api/community/posts/:postId/comments", async (req, res) => {
    try {
      const postId = parseInt(req.params.postId);
      const comments = await storage.getPostComments(postId);
      res.json(comments);
    } catch (error) {
      console.error("Get comments error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/community/posts/:postId/comments", async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      if (!sessionId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const session = sessions.get(sessionId);
      if (!session) {
        return res.status(401).json({ message: "Invalid session" });
      }

      const postId = parseInt(req.params.postId);
      const { content } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ message: "Comment content is required" });
      }

      const comment = await storage.createComment(postId, session.userId, content.trim());
      res.status(201).json(comment);
    } catch (error) {
      console.error("Create comment error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Subscription management routes
  app.get("/api/subscription/status", async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      if (!sessionId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const session = sessions.get(sessionId);
      if (!session) {
        return res.status(401).json({ message: "Invalid session" });
      }

      const user = await storage.getUser(session.userId);
      const subscription = await storage.getUserSubscription(session.userId);
      
      res.json({
        subscriptionStatus: user?.subscriptionStatus || 'free',
        isBetaUser: user?.isBetaUser || false,
        subscription: subscription || null
      });
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ message: "Failed to fetch subscription status" });
    }
  });

  app.post("/api/subscription/create-trial", async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      if (!sessionId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const session = sessions.get(sessionId);
      if (!session) {
        return res.status(401).json({ message: "Invalid session" });
      }

      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user already has a subscription
      const existingSubscription = await storage.getUserSubscription(session.userId);
      if (existingSubscription) {
        return res.status(400).json({ message: "User already has a subscription" });
      }

      const trialStart = new Date();
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7); // 7-day trial

      const subscription = await storage.createSubscription({
        userId: session.userId,
        planType: 'premium_monthly',
        status: 'trial',
        trialStart,
        trialEnd,
        founderDiscount: user.isBetaUser || false,
        discountPercent: user.isBetaUser ? 50 : 0
      });

      // Update user subscription status
      await storage.updateUser(session.userId, { subscriptionStatus: 'trial' });

      res.status(201).json({ subscription, message: "Trial started successfully" });
    } catch (error) {
      console.error("Error creating trial:", error);
      res.status(500).json({ message: "Failed to create trial" });
    }
  });

  app.post("/api/subscription/upgrade", async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      if (!sessionId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const session = sessions.get(sessionId);
      if (!session) {
        return res.status(401).json({ message: "Invalid session" });
      }

      const { planType } = req.body; // 'premium_monthly' or 'premium_yearly'
      
      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const subscription = await storage.getUserSubscription(session.userId);
      if (!subscription) {
        return res.status(404).json({ message: "No subscription found" });
      }

      const currentPeriodStart = new Date();
      const currentPeriodEnd = new Date();
      
      if (planType === 'premium_yearly') {
        currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
      } else {
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
      }

      const updatedSubscription = await storage.updateSubscription(subscription.id, {
        planType,
        status: 'active',
        currentPeriodStart,
        currentPeriodEnd
      });

      // Update user subscription status
      await storage.updateUser(session.userId, { subscriptionStatus: 'premium' });

      // Add to subscription history
      await storage.addSubscriptionHistory({
        subscriptionId: subscription.id,
        action: subscription.planType === planType ? 'renewed' : 'upgraded',
        fromPlan: subscription.planType,
        toPlan: planType,
        effectiveDate: currentPeriodStart,
        notes: `Upgraded to ${planType}`
      });

      res.json({ subscription: updatedSubscription, message: "Subscription upgraded successfully" });
    } catch (error) {
      console.error("Error upgrading subscription:", error);
      res.status(500).json({ message: "Failed to upgrade subscription" });
    }
  });

  app.post("/api/subscription/cancel", async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      if (!sessionId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const session = sessions.get(sessionId);
      if (!session) {
        return res.status(401).json({ message: "Invalid session" });
      }

      const subscription = await storage.getUserSubscription(session.userId);
      if (!subscription) {
        return res.status(404).json({ message: "No subscription found" });
      }

      const updatedSubscription = await storage.updateSubscription(subscription.id, {
        status: 'canceled',
        canceledAt: new Date()
      });

      // Add to subscription history
      await storage.addSubscriptionHistory({
        subscriptionId: subscription.id,
        action: 'canceled',
        fromPlan: subscription.planType,
        toPlan: null,
        effectiveDate: new Date(),
        notes: 'Subscription canceled by user'
      });

      res.json({ subscription: updatedSubscription, message: "Subscription canceled successfully" });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  app.get("/api/subscription/billing-history", async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      if (!sessionId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const session = sessions.get(sessionId);
      if (!session) {
        return res.status(401).json({ message: "Invalid session" });
      }

      const subscription = await storage.getUserSubscription(session.userId);
      if (!subscription) {
        return res.json({ payments: [] });
      }

      const payments = await storage.getPaymentHistory(subscription.id);
      res.json({ payments });
    } catch (error) {
      console.error("Error fetching billing history:", error);
      res.status(500).json({ message: "Failed to fetch billing history" });
    }
  });

  // Content access check
  app.get("/api/content/access-check", async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      if (!sessionId) {
        return res.status(401).json({ message: "Not authenticated" });
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

      let hasAccess = false;

      // Beta users get full access
      if (user.isBetaUser) {
        hasAccess = true;
      }
      // Premium subscribers get full access
      else if (subscription && (subscription.status === 'active' || subscription.status === 'trial')) {
        hasAccess = true;
      }
      // Free users - limited access
      else {
        if (contentType === 'basic_module_1' || contentType === 'community_read') {
          hasAccess = true;
        }
      }

      res.json({ 
        hasAccess, 
        subscriptionStatus: user.subscriptionStatus,
        isBetaUser: user.isBetaUser,
        subscription: subscription || null
      });
    } catch (error) {
      console.error("Error checking content access:", error);
      res.status(500).json({ message: "Failed to check content access" });
    }
  });

  // Trial creation endpoint
  app.post("/api/subscription/create-trial", async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      if (!sessionId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const session = sessions.get(sessionId);
      if (!session) {
        return res.status(401).json({ message: "Invalid session" });
      }
      
      // Check if user already has a trial or subscription
      const existingSubscription = await storage.getUserSubscription(session.userId);
      if (existingSubscription) {
        return res.status(400).json({ message: "User already has a subscription or trial" });
      }
      
      // Create trial subscription
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 7); // 7 days from now
      
      const subscription = await storage.createSubscription({
        userId: session.userId,
        planType: 'trial',
        status: 'trial',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        paypalSubscriptionId: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEndDate,
        trialStart: new Date(),
        trialEnd: trialEndDate,
        canceledAt: null,
        founderDiscount: false,
        discountPercent: 0
      });
      
      // Update user subscription status
      await storage.updateUser(session.userId, {
        subscriptionStatus: 'trial'
      });
      
      res.json({
        success: true,
        subscription: subscription,
        trialEndsAt: trialEndDate
      });
    } catch (error) {
      console.error("Create trial error:", error);
      res.status(500).json({ message: "Failed to create trial" });
    }
  });

  // Admin routes for subscription management
  app.post("/api/admin/beta-users/grant-access", async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      if (!sessionId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const session = sessions.get(sessionId);
      if (!session) {
        return res.status(401).json({ message: "Invalid session" });
      }

      const { userId } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.updateUser(userId, {
        isBetaUser: true,
        betaStartDate: new Date(),
        subscriptionStatus: 'premium'
      });

      res.json({ message: "Beta access granted successfully" });
    } catch (error) {
      console.error("Error granting beta access:", error);
      res.status(500).json({ message: "Failed to grant beta access" });
    }
  });

  app.get("/api/admin/subscriptions", async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      if (!sessionId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const session = sessions.get(sessionId);
      if (!session) {
        return res.status(401).json({ message: "Invalid session" });
      }

      // This would require admin role check in a real implementation
      const allUsers = Array.from((storage as any).users.values());
      const allSubscriptions = Array.from((storage as any).subscriptions.values());
      
      const subscriptionData = allUsers.map(user => {
        const subscription = allSubscriptions.find(sub => sub.userId === user.id);
        return {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isBetaUser: user.isBetaUser,
            subscriptionStatus: user.subscriptionStatus
          },
          subscription: subscription || null
        };
      });

      res.json({ subscriptions: subscriptionData });
    } catch (error) {
      console.error("Error fetching admin subscriptions:", error);
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  // Upload signed URL endpoint
  app.post("/api/uploads/sign", async (req, res) => {
    try {
      const { contentType } = req.body;

      // Validate content type
      const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
      if (!contentType || !ALLOWED_TYPES.includes(contentType)) {
        return res.status(400).json({ 
          message: "Invalid content type. Allowed types: " + ALLOWED_TYPES.join(', ')
        });
      }

      // Check authentication
      const sessionId = req.cookies?.sessionId;
      if (!sessionId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const session = sessions.get(sessionId);
      if (!session) {
        return res.status(401).json({ message: "Invalid session" });
      }

      // Import storage function dynamically to avoid circular dependency
      const { getSignedPutUrl } = await import('./config/storage');
      
      // Generate signed URL
      const result = await getSignedPutUrl(contentType);
      
      res.json(result);
    } catch (error: any) {
      console.error("Error generating signed URL:", error);
      if (error.message?.includes('not configured')) {
        return res.status(503).json({ 
          message: "File upload service not configured. Please contact support." 
        });
      }
      res.status(500).json({ message: "Failed to generate upload URL" });
    }
  });

  // Register posts module routes (database-backed system)
  app.use("/api/posts", postsRouter);
  
  // Register search module routes
  app.use("/api/search", searchRouter);
  
  // Register users module routes - includes blocking endpoints
  app.use("/api/users", usersRouter);
  app.use("/api/users", blockingRouter);
  
  // Register notifications module routes
  app.use("/api/notifications", notificationsRouter);
  
  // Register drafts module routes
  app.use("/api/drafts", draftsRouter);

  const httpServer = createServer(app);
  return httpServer;
}
