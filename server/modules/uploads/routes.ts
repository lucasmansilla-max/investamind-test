/**
 * Upload Routes
 */

import { Router } from "express";
import { asyncHandler } from "../../middlewares/error";
import { requireAuth } from "../../middlewares/auth";

const router = Router();

/**
 * Get signed URL for file upload
 */
router.post(
  "/sign",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { contentType } = req.body;

    // Validate content type
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
    if (!contentType || !ALLOWED_TYPES.includes(contentType)) {
      return res.status(400).json({
        message:
          "Invalid content type. Allowed types: " + ALLOWED_TYPES.join(", "),
      });
    }

    // Import storage function dynamically to avoid circular dependency
    const { getSignedPutUrl } = await import("../../config/storage");

    // Generate signed URL
    const result = await getSignedPutUrl(contentType);

    res.json(result);
  })
);

export default router;

