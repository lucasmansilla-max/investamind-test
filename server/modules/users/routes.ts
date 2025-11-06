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
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const userId = session.userId;

    const followingId = parseInt(req.params.id);
    if (isNaN(followingId)) {
      return res.status(400).json({ error: "Invalid user ID" });
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
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const userId = session.userId;

    const followingId = parseInt(req.params.id);
    if (isNaN(followingId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const result = await unfollowUser({
      followerId: userId,
      followingId,
    });

    res.json(result);
  })
);

router.get(
  "/:id/followers",
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const userId = session.userId;

    const targetUserId = parseInt(req.params.id);
    if (isNaN(targetUserId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const { cursor, limit } = req.query;

    const result = await getFollowers({
      userId: targetUserId,
      requesterId: userId,
      cursor: cursor as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json(result);
  })
);

router.get(
  "/:id/following",
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const userId = session.userId;

    const targetUserId = parseInt(req.params.id);
    if (isNaN(targetUserId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const { cursor, limit } = req.query;

    const result = await getFollowing({
      userId: targetUserId,
      requesterId: userId,
      cursor: cursor as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json(result);
  })
);

router.get(
  "/suggest",
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { q, limit } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const results = await suggestUsers(
      q,
      limit ? parseInt(limit as string) : 10
    );

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
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const userId = session.userId;

    const targetUserId = parseInt(req.params.id);
    if (isNaN(targetUserId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const { cursor, limit } = req.query;

    const result = await getUserPosts({
      userId: targetUserId,
      requesterId: userId,
      cursor: cursor as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json(result);
  })
);

export default router;
