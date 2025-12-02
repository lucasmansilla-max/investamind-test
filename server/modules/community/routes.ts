/**
 * Community Routes (Legacy endpoints)
 * These endpoints maintain backward compatibility with the old API structure
 */

import { Router } from "express";
import { asyncHandler } from "../../middlewares/error";
import { requireAuth } from "../../middlewares/auth";
import { storage } from "../../storage";
import { parsePaginationParams, buildPaginationResult } from "../../utils/pagination";
import { desc, isNotNull } from "drizzle-orm";
import { isAdmin, canViewTradingAlerts, canCreateTradingAlerts } from "../../utils/roles";
import { db } from "../../config/db";
import { communityPosts } from "@shared/schema";
import { createPost } from "../posts/service";
import {
  createPostSchema,
  idParamSchema,
  commentContentSchema,
  validateRequest,
} from "../../utils/validation";
import { z } from "zod";

const router = Router();

/**
 * GET /api/community/posts
 * Get community posts with pagination and filtering
 */
router.get(
  "/posts",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user || !req.session) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Check if user can view trading alerts
    const canViewAlerts = canViewTradingAlerts(req.user);

    // Support optional pagination - if no cursor provided, return full feed (backward compatible)
    const usePagination = !!req.query.cursor || req.query.limit;

    // Check if user is admin
    const userIsAdmin = isAdmin(req.user);

    let posts;
    if (usePagination) {
      const { cursor, limit } = parsePaginationParams(req.query);
      posts = await storage.getPostsPaginated({
        currentUserId: req.user.id,
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
        const isLiked = await storage.isPostLiked(req.user.id, post.id);
        const isReposted = await storage.isPostReposted(req.user.id, post.id);
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
 * POST /api/community/posts
 * Create a new community post
 */
router.post(
  "/posts",
  requireAuth,
  validateRequest(z.object({
    content: z.string().min(1, 'El contenido es requerido').max(5000, 'El contenido no puede exceder 5000 caracteres'),
    messageType: z.enum(['general', 'signal', 'trading_alert']).optional(),
    postType: z.enum(['general', 'ad', 'advertisement']).optional().default('general'),
    imageUrl: z.string().url('La URL de la imagen debe ser válida').optional(),
  })),
  asyncHandler(async (req, res) => {
    if (!req.user || !req.session) {
      return res.status(401).json({ 
        message: "Debes iniciar sesión para crear un post.",
        code: "AUTHENTICATION_REQUIRED"
      });
    }

    const { content, messageType, postType, imageUrl } = req.body;

    // Verify user has permission to create trading alerts
    if (messageType === "signal" || messageType === "trading_alert") {
      if (!canCreateTradingAlerts(req.user)) {
        return res.status(403).json({
          message: "Se requiere una suscripción premium para crear alertas de trading",
          requiresUpgrade: true,
          code: "PREMIUM_REQUIRED",
        });
      }
    }

    // Check if user is admin and wants to create an ad
    if (postType === "ad" || postType === "advertisement") {
      if (!isAdmin(req.user)) {
        return res.status(403).json({
          message: "Solo los administradores pueden publicar anuncios",
          code: "ADMIN_ACCESS_REQUIRED",
        });
      }
    }

    // Use the new posts service which handles hashtag/mention parsing and storage
    const io = (req.app as any).io;
    const newPost = await createPost({
      userId: req.user.id,
      body: content.trim(),
      imageUrl: imageUrl || undefined,
      messageType: messageType || null,
      postType: postType || 'general',
      io: io,
    });

    // Add user information to the response for backward compatibility
    const postWithUser = {
      ...newPost,
      user: req.user
        ? {
            id: req.user.id,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            currentBadge: "TRADER",
          }
        : {
            id: req.user.id,
            firstName: "Unknown",
            lastName: "User",
            currentBadge: "NEWBIE",
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
  validateRequest(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    if (!req.user || !req.session) {
      return res.status(401).json({ 
        message: "Debes iniciar sesión para dar like a un post.",
        code: "AUTHENTICATION_REQUIRED"
      });
    }

    const postId = req.params.postId as unknown as number;
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
  validateRequest(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    if (!req.user || !req.session) {
      return res.status(401).json({ 
        message: "Debes iniciar sesión para ver el estado de like.",
        code: "AUTHENTICATION_REQUIRED"
      });
    }

    const postId = req.params.postId as unknown as number;
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
  validateRequest(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    if (!req.user || !req.session) {
      return res.status(401).json({ 
        message: "Debes iniciar sesión para repostear un post.",
        code: "AUTHENTICATION_REQUIRED"
      });
    }

    const postId = req.params.postId as unknown as number;
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
    const postId = parseInt(req.params.postId);
    const comments = await storage.getPostComments(postId);
    res.json(comments);
  })
);

/**
 * POST /api/community/posts/:postId/comments
 * Create a comment on a post
 */
router.post(
  "/posts/:postId/comments",
  requireAuth,
  validateRequest(idParamSchema, 'params'),
  validateRequest(z.object({
    content: commentContentSchema,
  })),
  asyncHandler(async (req, res) => {
    if (!req.user || !req.session) {
      return res.status(401).json({ 
        message: "Debes iniciar sesión para crear un comentario.",
        code: "AUTHENTICATION_REQUIRED"
      });
    }

    const postId = req.params.postId as unknown as number;
    const { content } = req.body;

    const comment = await storage.createComment(
      postId,
      req.user.id,
      content.trim()
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
  validateRequest(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    if (!req.user || !req.session) {
      return res.status(401).json({ 
        message: "Debes iniciar sesión para desactivar un post.",
        code: "AUTHENTICATION_REQUIRED"
      });
    }

    if (!isAdmin(req.user)) {
      return res.status(403).json({
        message: "Solo los administradores pueden desactivar posts.",
        code: "ADMIN_ACCESS_REQUIRED",
      });
    }

    const postId = req.params.postId as unknown as number;

    const { deactivatePost } = await import("../posts/service.js");
    const deactivatedPost = await deactivatePost(postId, req.user.id);

    return res.status(200).json({
      message: "Post desactivado exitosamente",
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
  validateRequest(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    if (!req.user || !req.session) {
      return res.status(401).json({ 
        message: "Debes iniciar sesión para reactivar un post.",
        code: "AUTHENTICATION_REQUIRED"
      });
    }

    if (!isAdmin(req.user)) {
      return res.status(403).json({
        message: "Solo los administradores pueden reactivar posts.",
        code: "ADMIN_ACCESS_REQUIRED",
      });
    }

    const postId = req.params.postId as unknown as number;

    const { reactivatePost } = await import("../posts/service.js");
    const reactivatedPost = await reactivatePost(postId, req.user.id);

    return res.status(200).json({
      message: "Post reactivado exitosamente",
      post: reactivatedPost,
    });
  })
);

export default router;

