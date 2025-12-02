import { Router, type Request } from "express";
import { asyncHandler } from "../../middlewares/error";
import { createComment, getComments } from "./service";
import {
  createCommentSchema,
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

// POST /api/posts/:id/comments - Create a comment
router.post(
  "/:id/comments",
  validateParam('id'),
  validateRequest(createCommentSchema),
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ 
        message: "Debes iniciar sesión para crear un comentario.",
        code: "AUTHENTICATION_REQUIRED"
      });
    }

    const postId = req.params.id as unknown as number;
    const { body, parentCommentId } = req.body;

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
  validateParam('id'),
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ 
        message: "Debes iniciar sesión para ver los comentarios.",
        code: "AUTHENTICATION_REQUIRED"
      });
    }

    const postId = req.params.id as unknown as number;
    const { parentId, cursor, limit } = req.query;

    // Parse parentId - can be null (string "null" or undefined) or a number
    let parsedParentId: number | null = null;
    if (parentId && parentId !== "null") {
      const parsed = parseInt(parentId as string, 10);
      if (isNaN(parsed)) {
        return res.status(400).json({ 
          message: "El ID del comentario padre no es válido.",
          code: "INVALID_PARENT_COMMENT_ID"
        });
      }
      parsedParentId = parsed;
    }

    const parsedLimit = limit ? parseInt(limit as string, 10) : undefined;
    if (limit && (isNaN(parsedLimit!) || parsedLimit! < 1)) {
      return res.status(400).json({ 
        message: "El límite debe ser un número positivo.",
        code: "INVALID_LIMIT"
      });
    }

    const result = await getComments({
      postId,
      parentId: parsedParentId,
      cursor: cursor as string | undefined,
      limit: parsedLimit,
      requesterId: session.userId,
    });

    res.json(result);
  })
);

export default router;
