/**
 * Community Routes (Legacy endpoints)
 * These endpoints maintain backward compatibility with the old API structure
 */

import { Router } from "express";
import { asyncHandler } from "../../middlewares/error";
import { requireAuth, requirePremium } from "../../middlewares/auth";
import { storage } from "../../storage";
import { parsePaginationParams, buildPaginationResult } from "../../utils/pagination";
import { desc, isNotNull } from "drizzle-orm";
import { isAdmin, canViewTradingAlerts, canCreateTradingAlerts } from "../../utils/roles";
import { db } from "../../config/db";
import { communityPosts } from "@shared/schema";
import { createPost } from "../posts/service";
import { validateRequest, commentContentSchema, postContentSchema, urlSchema } from "../../utils/validation";
import { z } from "zod";

const router = Router();

/**
 * GET /api/community/posts
 * Get community posts with pagination and filtering (premium users only)
 */
router.get(
  "/posts",
  requireAuth,
  requirePremium,
  asyncHandler(async (req, res) => {
    if (!req.user || !req.session) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user; // Type narrowing for nested callbacks

    // Check if user can view trading alerts
    const canViewAlerts = canViewTradingAlerts(user);

    // Support optional pagination - if no cursor provided, return full feed (backward compatible)
    const usePagination = !!req.query.cursor || req.query.limit;

    // Check if user is admin
    const userIsAdmin = isAdmin(user);

    let posts;
    if (usePagination) {
      const { cursor, limit } = parsePaginationParams(req.query);
      posts = await storage.getPostsPaginated({
        currentUserId: user.id,
        cursor: cursor || undefined,
        limit,
      });
      // Build pagination result with proper typing
      const postsWithDates = posts.filter(
        (p) => p.createdAt !== null
      ) as Array<{ createdAt: Date; id: number } & (typeof posts)[0]>;
      const paginationResult = buildPaginationResult(postsWithDates, limit);
      posts = paginationResult.data;
    } else {
      // Full feed mode - get all posts (legacy behavior)
      posts = await storage.getAllPosts();

      // If admin, also get deactivated posts
      if (userIsAdmin) {
        const deactivatedPosts = await db
          .select()
          .from(communityPosts)
          .where(isNotNull(communityPosts.deletedAt))
          .orderBy(desc(communityPosts.createdAt));

        // Combine active and deactivated posts, sort by createdAt
        posts = [...posts, ...deactivatedPosts].sort((a, b) => {
          const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bDate - aDate;
        });
      }
    }

    // Filter out trading alerts for free users
    if (!canViewAlerts) {
      posts = posts.filter((post) => {
        const messageType = post.messageType;
        // Filter out posts with messageType 'signal' or 'trading_alert'
        return messageType !== "signal" && messageType !== "trading_alert";
      });
    }

    // Filter out deactivated posts for non-admin users
    if (!userIsAdmin) {
      posts = posts.filter((post) => !post.deletedAt);
    }

    // Add user information and interaction status to each post
    const postsWithUsers = await Promise.all(
      posts.map(async (post) => {
        const postUser = await storage.getUser(post.userId);
        const isLiked = await storage.isPostLiked(user.id, post.id);
        const isReposted = await storage.isPostReposted(user.id, post.id);
        return {
          ...post,
          deletedAt: post.deletedAt ? post.deletedAt.toISOString() : null,
          user: postUser
            ? {
                id: postUser.id,
                firstName: postUser.firstName,
                lastName: postUser.lastName,
                currentBadge: "TRADER",
                role: postUser.role,
              }
            : {
                id: post.userId,
                firstName: "Unknown",
                lastName: "User",
                currentBadge: "NEWBIE",
              },
          isLiked,
          isReposted,
          isBookmarked: false,
        };
      })
    );

    // Maintain backward compatibility: return array for now
    res.json(postsWithUsers);
  })
);

/**
 * Schema for community post creation (uses 'content' instead of 'body')
 */
const createCommunityPostSchema = z.object({
  content: postContentSchema,
  messageType: z.string().optional(),
  postType: z.enum(['general', 'ad', 'advertisement']).optional().default('general'),
  imageUrl: urlSchema,
  ticker: z.string().max(10).optional(),
  signalData: z.object({
    type: z.string(),
    entryPrice: z.coerce.number().optional(),
    targetPrice: z.coerce.number().optional(),
    stopLoss: z.coerce.number().optional(),
    timeframe: z.string().optional(),
  }).optional().nullable(),
  predictionData: z.object({
    currentPrice: z.coerce.number().optional(),
    predictedPrice: z.coerce.number(),
    timeframe: z.string(),
    confidence: z.coerce.number().min(1).max(10).optional(),
  }).optional().nullable(),
  analysisType: z.string().optional(),
  tags: z.array(z.string()).optional(),
  xpReward: z.coerce.number().int().min(0).optional(),
});

/**
 * POST /api/community/posts
 * Create a new community post (premium users only)
 */
router.post(
  "/posts",
  requireAuth,
  requirePremium,
  validateRequest(createCommunityPostSchema),
  asyncHandler(async (req, res) => {
    if (!req.user || !req.session) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user; // Type narrowing

    const { content, messageType, postType, imageUrl, ticker, signalData, predictionData, analysisType, xpReward } = req.body;
    // Verify user has permission to create trading alerts
    if (messageType === "signal" || messageType === "trading_alert") {
      if (!canCreateTradingAlerts(user)) {
        return res.status(403).json({
          message: "Premium subscription required to create trading alerts",
          requiresUpgrade: true,
        });
      }
    }

    // Check if user is admin and wants to create an ad
    if (postType === "ad" || postType === "advertisement") {
      if (!isAdmin(user)) {
        return res.status(403).json({
          message: "Only admins can publish ads",
        });
      }
    }

    // Use the new posts service which handles hashtag/mention parsing and storage
    const io = (req.app as any).io;
    const newPost = await createPost({
      userId: user.id,
      body: content,
      imageUrl: imageUrl || undefined,
      messageType: messageType || null,
      postType: postType,
      ticker: ticker || undefined,
      signalData: signalData || undefined,
      predictionData: predictionData || undefined,
      analysisType: analysisType || undefined,
      xpReward: xpReward || undefined,
      io: io,
    });

    // Add user information to the response for backward compatibility
    const postWithUser = {
      ...newPost,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        currentBadge: "TRADER",
      },
    };

    res.status(201).json(postWithUser);
  })
);

/**
 * POST /api/community/posts/:postId/like
 * Like or unlike a post
 */
router.post(
  "/posts/:postId/like",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user || !req.session) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const postId = parseInt(req.params.postId, 10);
    if (isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }
    const isLiked = await storage.isPostLiked(req.user.id, postId);

    if (isLiked) {
      await storage.unlikePost(req.user.id, postId);
    } else {
      await storage.likePost(req.user.id, postId);
    }

    res.json({ liked: !isLiked });
  })
);

/**
 * GET /api/community/posts/:postId/like-status
 * Get post like status
 */
router.get(
  "/posts/:postId/like-status",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user || !req.session) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const postId = parseInt(req.params.postId, 10);
    if (isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }
    const isLiked = await storage.isPostLiked(req.user.id, postId);

    res.json({ liked: isLiked });
  })
);

/**
 * POST /api/community/posts/:postId/repost
 * Repost or unrepost a post
 */
router.post(
  "/posts/:postId/repost",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user || !req.session) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const postId = parseInt(req.params.postId, 10);
    if (isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }
    const isReposted = await storage.isPostReposted(req.user.id, postId);

    if (isReposted) {
      await storage.unrepostPost(req.user.id, postId);
    } else {
      await storage.repostPost(req.user.id, postId);
    }

    res.json({ reposted: !isReposted });
  })
);

/**
 * GET /api/community/posts/:postId/comments
 * Get comments for a post
 */
router.get(
  "/posts/:postId/comments",
  asyncHandler(async (req, res) => {
    const postId = parseInt(req.params.postId, 10);
    if (isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }
    const comments = await storage.getPostComments(postId);
    res.json(comments);
  })
);

/**
 * Schema for comment creation
 */
const createCommunityCommentSchema = z.object({
  content: commentContentSchema,
});

/**
 * POST /api/community/posts/:postId/comments
 * Create a comment on a post
 */
router.post(
  "/posts/:postId/comments",
  requireAuth,
  validateRequest(createCommunityCommentSchema),
  asyncHandler(async (req, res) => {
    if (!req.user || !req.session) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const postId = parseInt(req.params.postId, 10);
    if (isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }
    const { content } = req.body;

    const comment = await storage.createComment(
      postId,
      req.user.id,
      content
    );
    res.status(201).json(comment);
  })
);

/**
 * POST /api/community/posts/:postId/deactivate
 * Deactivate a post (admin only)
 */
router.post(
  "/posts/:postId/deactivate",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user || !req.session) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!isAdmin(req.user)) {
      return res.status(403).json({
        message: "Forbidden: Admin access required",
      });
    }

    const postId = parseInt(req.params.postId, 10);
    if (isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const { deactivatePost } = await import("../posts/service.js");
    const deactivatedPost = await deactivatePost(postId, req.user.id);

    return res.status(200).json({
      message: "Post deactivated successfully",
      post: deactivatedPost,
    });
  })
);

/**
 * POST /api/community/posts/:postId/reactivate
 * Reactivate a post (admin only)
 */
router.post(
  "/posts/:postId/reactivate",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user || !req.session) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!isAdmin(req.user)) {
      return res.status(403).json({
        message: "Forbidden: Admin access required",
      });
    }

    const postId = parseInt(req.params.postId, 10);
    if (isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const { reactivatePost } = await import("../posts/service.js");
    const reactivatedPost = await reactivatePost(postId, req.user.id);

    return res.status(200).json({
      message: "Post reactivated successfully",
      post: reactivatedPost,
    });
  })
);

export default router;
