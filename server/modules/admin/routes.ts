/**
 * Admin Routes
 * Handles admin-only endpoints for system management
 */

import { Router } from "express";
import { asyncHandler } from "../../middlewares/error";
import { requireAuth, requireAdmin } from "../../middlewares/auth";
import { storage } from "../../storage";
import { insertLearningModuleSchema, insertModuleVideoSchema } from "@shared/schema";
import { isValidYouTubeUrl } from "../../utils/youtubeValidation";

const router = Router();

/**
 * Get all webhook logs (admin only)
 */
router.get(
  "/webhook-logs",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const source = req.query.source as string | undefined;
    const status = req.query.status as string | undefined;

    const logs = await storage.getWebhookLogs({
      limit,
      offset,
      source,
      status,
    });

    res.json({ logs });
  })
);

/**
 * Get a specific webhook log by ID (admin only)
 */
router.get(
  "/webhook-logs/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid log ID" });
    }

    const log = await storage.getWebhookLog(id);
    if (!log) {
      return res.status(404).json({ error: "Log not found" });
    }

    res.json({ log });
  })
);

/**
 * Get all users (admin only)
 */
router.get(
  "/users",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    // This is a placeholder - you may need to implement getAllUsers in storage
    // For now, we'll return an empty array or implement a basic version
    res.json([]);
  })
);

/**
 * Create a new learning module with optional videos (admin only)
 */
router.post(
  "/modules",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    // Extract videos from request body (if any)
    const { videos, ...moduleDataRaw } = req.body;
    
    // Validate and parse the module data
    const moduleData = insertLearningModuleSchema.parse(moduleDataRaw);

    // Check if orderIndex already exists
    const orderExists = await storage.checkOrderIndexExists(moduleData.orderIndex);
    if (orderExists) {
      return res.status(400).json({
        error: `Ya existe un módulo creado para el índice ${moduleData.orderIndex}`,
      });
    }

    // Create the module
    const module = await storage.createModule(moduleData);

    // Create videos if provided
    if (videos && Array.isArray(videos) && videos.length > 0) {
      const createdVideos = [];
      for (const videoData of videos) {
        // Validate YouTube URL
        if (!isValidYouTubeUrl(videoData.videoUrl)) {
          return res.status(400).json({
            error: `Invalid YouTube URL format for video: ${videoData.title || 'unnamed'}. Please provide a valid YouTube URL.`,
          });
        }

        // Validate and parse video data
        const validatedVideo = insertModuleVideoSchema.parse({
          ...videoData,
          moduleId: module.id,
        });

        const video = await storage.createModuleVideo(validatedVideo);
        createdVideos.push(video);
      }
      
      // Return module with videos
      return res.status(201).json({
        ...module,
        videos: createdVideos,
      });
    }

    // Return module without videos
    res.status(201).json({
      ...module,
      videos: [],
    });
  })
);

/**
 * Get videos for a module (admin only)
 */
router.get(
  "/modules/:moduleId/videos",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const moduleId = parseInt(req.params.moduleId);
    if (isNaN(moduleId)) {
      return res.status(400).json({ error: "Invalid module ID" });
    }

    const videos = await storage.getModuleVideos(moduleId);
    res.json(videos);
  })
);

/**
 * Add a video to a module (admin only)
 */
router.post(
  "/modules/:moduleId/videos",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const moduleId = parseInt(req.params.moduleId);
    if (isNaN(moduleId)) {
      return res.status(400).json({ error: "Invalid module ID" });
    }

    // Validate module exists
    const module = await storage.getModule(moduleId);
    if (!module) {
      return res.status(404).json({ error: "Module not found" });
    }

    // Validate and parse video data
    const videoData = insertModuleVideoSchema.parse({
      ...req.body,
      moduleId,
    });

    // Validate YouTube URL
    if (!isValidYouTubeUrl(videoData.videoUrl)) {
      return res.status(400).json({
        error: "Invalid YouTube URL format. Please provide a valid YouTube URL.",
      });
    }

    // Create the video
    const video = await storage.createModuleVideo(videoData);
    res.status(201).json(video);
  })
);

/**
 * Update a video (admin only)
 */
router.put(
  "/videos/:videoId",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const videoId = parseInt(req.params.videoId);
    if (isNaN(videoId)) {
      return res.status(400).json({ error: "Invalid video ID" });
    }

    const updates = insertModuleVideoSchema.partial().parse(req.body);

    // Validate YouTube URL if provided
    if (updates.videoUrl && !isValidYouTubeUrl(updates.videoUrl)) {
      return res.status(400).json({
        error: "Invalid YouTube URL format. Please provide a valid YouTube URL.",
      });
    }

    const video = await storage.updateModuleVideo(videoId, updates);
    res.json(video);
  })
);

/**
 * Delete a video (admin only)
 */
router.delete(
  "/videos/:videoId",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const videoId = parseInt(req.params.videoId);
    if (isNaN(videoId)) {
      return res.status(400).json({ error: "Invalid video ID" });
    }

    await storage.deleteModuleVideo(videoId);
    res.status(204).send();
  })
);

export default router;

