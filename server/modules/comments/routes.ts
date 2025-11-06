import { Router, type Request } from "express";
import { asyncHandler } from "../../middlewares/error";
import { createComment, getComments } from "./service";
import { z } from "zod";

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

// POST /api/posts/:id/comments - Create a comment
router.post(
  "/:id/comments",
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      return res.status(400).json({ error: "Invalid post ID" });
    }

    const bodySchema = z.object({
      body: z.string().min(1).max(1000),
      parentCommentId: z.number().optional(),
    });

    const result = bodySchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { body, parentCommentId } = result.data;

    const comment = await createComment({
      postId,
      userId: session.userId,
      body,
      parentCommentId,
      io: req.app.io,
    });

    res.status(201).json(comment);
  })
);

// GET /api/posts/:id/comments - Get comments for a post
router.get(
  "/:id/comments",
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      return res.status(400).json({ error: "Invalid post ID" });
    }

    const { parentId, cursor, limit } = req.query;

    // Parse parentId - can be null (string "null" or undefined) or a number
    let parsedParentId: number | null = null;
    if (parentId && parentId !== "null") {
      parsedParentId = parseInt(parentId as string);
      if (isNaN(parsedParentId)) {
        return res.status(400).json({ error: "Invalid parent comment ID" });
      }
    }

    const result = await getComments({
      postId,
      parentId: parsedParentId,
      cursor: cursor as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      requesterId: session.userId,
    });

    res.json(result);
  })
);

export default router;
