import { Router, type Request } from "express";
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getUserProfile,
  getUserPosts,
  suggestUsers,
} from "./service";
import { asyncHandler } from "../../middlewares/error";
import {
  searchQuerySchema,
  validateRequest,
  validateParam,
} from "../../utils/validation";

const router = Router();

/**
 * Helper to get session from request
 */
function getSession(req: Request): { userId: number } | null {
  const sessionId = req.cookies?.sessionId;
  if (!sessionId) return null;
  
  // Access sessions from routes.ts (temporary until session management is centralized)
  const sessions = (global as any).__sessions;
  if (!sessions) return null;
  
  return sessions.get(sessionId) || null;
}

router.post(
  "/:id/follow",
  validateParam('id'),
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ 
        message: "Debes iniciar sesión para seguir a un usuario.",
        code: "AUTHENTICATION_REQUIRED"
      });
    }
    
    const userId = session.userId;
    const followingId = req.params.id as unknown as number;

    // Prevent users from following themselves
    if (userId === followingId) {
      return res.status(400).json({ 
        message: "No puedes seguirte a ti mismo.",
        code: "CANNOT_FOLLOW_SELF"
      });
    }

    // Get Socket.IO instance from app
    const io = (req.app as any).io;

    const result = await followUser({
      followerId: userId,
      followingId,
      io,
    });

    res.status(201).json(result);
  })
);

router.delete(
  "/:id/follow",
  validateParam('id'),
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ 
        message: "Debes iniciar sesión para dejar de seguir a un usuario.",
        code: "AUTHENTICATION_REQUIRED"
      });
    }
    
    const userId = session.userId;
    const followingId = req.params.id as unknown as number;

    const result = await unfollowUser({
      followerId: userId,
      followingId,
    });

    res.json(result);
  })
);

router.get(
  "/:id/followers",
  validateParam('id'),
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ 
        message: "Debes iniciar sesión para ver los seguidores.",
        code: "AUTHENTICATION_REQUIRED"
      });
    }
    
    const userId = session.userId;
    const targetUserId = req.params.id as unknown as number;
    const { cursor, limit } = req.query;

    const parsedLimit = limit ? parseInt(limit as string, 10) : undefined;
    if (limit && (isNaN(parsedLimit!) || parsedLimit! < 1)) {
      return res.status(400).json({ 
        message: "El límite debe ser un número positivo.",
        code: "INVALID_LIMIT"
      });
    }

    const result = await getFollowers({
      userId: targetUserId,
      requesterId: userId,
      cursor: cursor as string | undefined,
      limit: parsedLimit,
    });

    res.json(result);
  })
);

router.get(
  "/:id/following",
  validateParam('id'),
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ 
        message: "Debes iniciar sesión para ver a quién sigue un usuario.",
        code: "AUTHENTICATION_REQUIRED"
      });
    }
    
    const userId = session.userId;
    const targetUserId = req.params.id as unknown as number;
    const { cursor, limit } = req.query;

    const parsedLimit = limit ? parseInt(limit as string, 10) : undefined;
    if (limit && (isNaN(parsedLimit!) || parsedLimit! < 1)) {
      return res.status(400).json({ 
        message: "El límite debe ser un número positivo.",
        code: "INVALID_LIMIT"
      });
    }

    const result = await getFollowing({
      userId: targetUserId,
      requesterId: userId,
      cursor: cursor as string | undefined,
      limit: parsedLimit,
    });

    res.json(result);
  })
);

router.get(
  "/suggest",
  validateRequest(searchQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ 
        message: "Debes iniciar sesión para buscar usuarios.",
        code: "AUTHENTICATION_REQUIRED"
      });
    }

    const { q, limit } = req.query as { q: string; limit: number };

    const results = await suggestUsers(q, limit || 10);

    res.json(results);
  })
);

router.get(
  "/:handle",
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const userId = session.userId;

    const { handle } = req.params;

    // Check if it's a numeric ID or username
    const isNumeric = /^\d+$/.test(handle);
    
    if (isNumeric) {
      // This is actually an ID request for followers/following/posts
      return res.status(400).json({ 
        error: "Please use /api/users/:id/followers, /api/users/:id/following, or /api/users/:id/posts" 
      });
    }

    const result = await getUserProfile(handle, userId);

    res.json(result);
  })
);

router.get(
  "/:id/posts",
  validateParam('id'),
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ 
        message: "Debes iniciar sesión para ver los posts de un usuario.",
        code: "AUTHENTICATION_REQUIRED"
      });
    }
    
    const userId = session.userId;
    const targetUserId = req.params.id as unknown as number;
    const { cursor, limit } = req.query;

    const parsedLimit = limit ? parseInt(limit as string, 10) : undefined;
    if (limit && (isNaN(parsedLimit!) || parsedLimit! < 1)) {
      return res.status(400).json({ 
        message: "El límite debe ser un número positivo.",
        code: "INVALID_LIMIT"
      });
    }

    const result = await getUserPosts({
      userId: targetUserId,
      requesterId: userId,
      cursor: cursor as string | undefined,
      limit: parsedLimit,
    });

    res.json(result);
  })
);

export default router;
