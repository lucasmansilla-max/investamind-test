import { Router, type Request } from "express";
import { searchPosts, searchByTag, SearchType } from "./service";
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

router.get(
  "/posts",
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const userId = session.userId;

    const { query, type = "auto", cursor, limit } = req.query;

    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    const searchType = (type as SearchType) || "auto";
    if (!["auto", "text", "hashtag", "ticker"].includes(searchType)) {
      return res.status(400).json({ error: "Invalid search type" });
    }

    const result = await searchPosts({
      query: query as string,
      type: searchType,
      userId,
      cursor: cursor as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json(result);
  })
);

router.get(
  "/tags/:tag",
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const userId = session.userId;

    const { tag } = req.params;
    const { cursor, limit } = req.query;

    if (!tag) {
      return res.status(400).json({ error: "Tag parameter is required" });
    }

    const result = await searchByTag({
      tag,
      userId,
      cursor: cursor as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json(result);
  })
);

export default router;
