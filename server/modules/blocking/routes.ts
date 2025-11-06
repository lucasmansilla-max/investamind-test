import { Router, type Request } from "express";
import { asyncHandler } from "../../middlewares/error";
import { blockUser, unblockUser } from "./service";

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

// POST /api/users/:id/block - Block a user
router.post(
  "/:id/block",
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const blockedId = parseInt(req.params.id);
    if (isNaN(blockedId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    try {
      await blockUser({
        blockerId: session.userId,
        blockedId,
      });

      res.json({ success: true });
    } catch (error) {
      if (error instanceof Error && error.message === "Cannot block yourself") {
        return res.status(400).json({ error: error.message });
      }
      throw error;
    }
  })
);

// DELETE /api/users/:id/block - Unblock a user
router.delete(
  "/:id/block",
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const blockedId = parseInt(req.params.id);
    if (isNaN(blockedId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    await unblockUser({
      blockerId: session.userId,
      blockedId,
    });

    res.json({ success: true });
  })
);

export default router;
