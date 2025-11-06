import { Router, type Request } from "express";
import { asyncHandler } from "../../middlewares/error";
import {
  createDraft,
  getDrafts,
  getDraft,
  updateDraft,
  deleteDraft,
  publishDraft,
} from "./service";
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

// GET /api/drafts - Get all drafts for the current user
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const draftsList = await getDrafts(session.userId);
    res.json(draftsList);
  })
);

// POST /api/drafts - Create a new draft
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const bodySchema = z.object({
      body: z.string().min(1).max(5000),
      imageUrl: z.string().url().optional(),
    });

    const result = bodySchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const draft = await createDraft({
      userId: session.userId,
      ...result.data,
    });

    res.status(201).json(draft);
  })
);

// PATCH /api/drafts/:id - Update a draft
router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid draft ID" });
    }

    const bodySchema = z.object({
      body: z.string().min(1).max(5000).optional(),
      imageUrl: z.string().url().optional().nullable(),
    });

    const result = bodySchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    try {
      const draft = await updateDraft({
        id,
        userId: session.userId,
        body: result.data.body,
        imageUrl: result.data.imageUrl === null ? undefined : result.data.imageUrl,
      });

      res.json(draft);
    } catch (error) {
      if (error instanceof Error && error.message === "Draft not found") {
        return res.status(404).json({ error: "Draft not found" });
      }
      throw error;
    }
  })
);

// DELETE /api/drafts/:id - Delete a draft
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid draft ID" });
    }

    await deleteDraft({
      id,
      userId: session.userId,
    });

    res.json({ success: true });
  })
);

// POST /api/drafts/:id/publish - Publish a draft (creates post and deletes draft)
router.post(
  "/:id/publish",
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid draft ID" });
    }

    try {
      const post = await publishDraft({
        id,
        userId: session.userId,
        io: req.app.io,
      });

      res.status(201).json(post);
    } catch (error) {
      if (error instanceof Error && error.message === "Draft not found") {
        return res.status(404).json({ error: "Draft not found" });
      }
      throw error;
    }
  })
);

export default router;
