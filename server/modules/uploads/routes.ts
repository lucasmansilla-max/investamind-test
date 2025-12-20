/**
 * Upload Routes
 */

import { Router } from "express";
import { asyncHandler } from "../../middlewares/error";
import { requireAuth } from "../../middlewares/auth";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const router = Router();

// Setup multer for file uploads
const uploadDir = path.resolve(process.cwd(), "public/uploads");

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, WEBP, GIF and SVG are allowed."));
    }
  },
});

/**
 * POST /uploads - Upload file directly
 */
router.post(
  "/",
  requireAuth,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Return the full URL to access the uploaded file
    const protocol = req.protocol;
    const host = req.get('host');
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    
    res.json({
      url: fileUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  })
);

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

