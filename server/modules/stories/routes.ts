/**
 * Stories routes module
 * Handles HTTP endpoints for story management
 */

import { Router, type Request, Response } from 'express';
import * as storiesService from './service';
import { asyncHandler } from '../../middlewares/error';
import { requireAuth } from '../../middlewares/auth';
import { z } from 'zod';

export const storiesRouter = Router();

/**
 * Helper to get session from request
 */
function getSession(req: Request): { userId: number } | null {
  const sessionId = req.cookies?.sessionId;
  if (!sessionId) return null;
  
  const sessions = (global as any).__sessions;
  if (!sessions) return null;
  
  return sessions.get(sessionId) || null;
}

/**
 * Validation schema for creating a story
 */
const createStorySchema = z.object({
  content: z
    .string()
    .min(1, 'Content is required')
    .max(500, 'Content cannot exceed 500 characters')
    .trim(),
  imageData: z.string().optional().nullable(), // Base64 encoded image
  mimeType: z.string().optional().nullable(), // image/jpeg, image/png, etc.
});

/**
 * Validation schema for feed query parameters
 */
const feedQuerySchema = z.object({
  cursor: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  limit: z.string().optional().transform(val => val ? parseInt(val) : undefined),
});

/**
 * POST /stories
 * Create a new story (all authenticated users can create)
 */
storiesRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const session = getSession(req);
    if (!session) {
      res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }

    // Validate request body
    const validation = createStorySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ 
        message: 'Invalid request data',
        errors: validation.error.errors,
        code: 'VALIDATION_ERROR'
      });
      return;
    }

    const { content, imageData, mimeType } = validation.data;

    try {
      const story = await storiesService.createStory({
        userId: session.userId,
        content,
        imageData: imageData || undefined,
        mimeType: mimeType || undefined,
      });

      res.status(201).json(story);
    } catch (error: any) {
      console.error('Error creating story:', error);
      res.status(500).json({ 
        message: 'Failed to create story',
        code: 'INTERNAL_ERROR'
      });
    }
  })
);

/**
 * GET /stories/feed
 * Get stories feed with pagination
 */
storiesRouter.get(
  '/feed',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const session = getSession(req);
    if (!session) {
      res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }

    // Validate query parameters
    const validation = feedQuerySchema.safeParse(req.query);
    if (!validation.success) {
      res.status(400).json({ 
        message: 'Invalid query parameters',
        errors: validation.error.errors,
        code: 'VALIDATION_ERROR'
      });
      return;
    }

    const { cursor, limit } = validation.data;

    try {
      const result = await storiesService.getStoriesFeed(session.userId, {
        cursor,
        limit,
      });

      res.json(result);
    } catch (error: any) {
      console.error('Error fetching stories feed:', error);
      res.status(500).json({ 
        message: 'Failed to fetch stories',
        code: 'INTERNAL_ERROR'
      });
    }
  })
);

/**
 * GET /stories/user/:userId
 * Get stories by a specific user
 */
storiesRouter.get(
  '/user/:userId',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const session = getSession(req);
    if (!session) {
      res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }

    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      res.status(400).json({ 
        message: 'Invalid user ID',
        code: 'INVALID_USER_ID'
      });
      return;
    }

    // Validate query parameters
    const validation = feedQuerySchema.safeParse(req.query);
    if (!validation.success) {
      res.status(400).json({ 
        message: 'Invalid query parameters',
        errors: validation.error.errors,
        code: 'VALIDATION_ERROR'
      });
      return;
    }

    const { cursor, limit } = validation.data;

    try {
      const result = await storiesService.getUserStories(
        userId,
        session.userId,
        { cursor, limit }
      );

      res.json(result);
    } catch (error: any) {
      console.error('Error fetching user stories:', error);
      res.status(500).json({ 
        message: 'Failed to fetch user stories',
        code: 'INTERNAL_ERROR'
      });
    }
  })
);

/**
 * GET /stories/:id
 * Get a single story by ID
 */
storiesRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const session = getSession(req);
    if (!session) {
      res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }

    const storyId = parseInt(req.params.id);
    if (isNaN(storyId)) {
      res.status(400).json({ 
        message: 'Invalid story ID',
        code: 'INVALID_STORY_ID'
      });
      return;
    }

    try {
      const story = await storiesService.getStoryById(storyId, session.userId);

      if (!story) {
        res.status(404).json({ 
          message: 'Story not found',
          code: 'STORY_NOT_FOUND'
        });
        return;
      }

      res.json(story);
    } catch (error: any) {
      console.error('Error fetching story:', error);
      res.status(500).json({ 
        message: 'Failed to fetch story',
        code: 'INTERNAL_ERROR'
      });
    }
  })
);

/**
 * POST /stories/:id/like
 * Toggle like on a story
 */
storiesRouter.post(
  '/:id/like',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const session = getSession(req);
    if (!session) {
      res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }

    const storyId = parseInt(req.params.id);
    if (isNaN(storyId)) {
      res.status(400).json({ 
        message: 'Invalid story ID',
        code: 'INVALID_STORY_ID'
      });
      return;
    }

    try {
      const result = await storiesService.toggleStoryLike(storyId, session.userId);
      res.json(result);
    } catch (error: any) {
      if (error.message === 'Story not found') {
        res.status(404).json({ 
          message: 'Story not found',
          code: 'STORY_NOT_FOUND'
        });
        return;
      }

      console.error('Error toggling story like:', error);
      res.status(500).json({ 
        message: 'Failed to toggle like',
        code: 'INTERNAL_ERROR'
      });
    }
  })
);

/**
 * DELETE /stories/:id
 * Delete a story (soft delete)
 */
storiesRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const session = getSession(req);
    if (!session) {
      res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }

    const storyId = parseInt(req.params.id);
    if (isNaN(storyId)) {
      res.status(400).json({ 
        message: 'Invalid story ID',
        code: 'INVALID_STORY_ID'
      });
      return;
    }

    try {
      await storiesService.deleteStory(storyId, session.userId);
      res.json({ message: 'Story deleted successfully' });
    } catch (error: any) {
      if (error.message === 'Story not found') {
        res.status(404).json({ 
          message: 'Story not found',
          code: 'STORY_NOT_FOUND'
        });
        return;
      }

      if (error.message === 'Unauthorized') {
        res.status(403).json({ 
          message: 'You do not have permission to delete this story',
          code: 'UNAUTHORIZED'
        });
        return;
      }

      console.error('Error deleting story:', error);
      res.status(500).json({ 
        message: 'Failed to delete story',
        code: 'INTERNAL_ERROR'
      });
    }
  })
);

/**
 * POST /stories/:id/view
 * Increment view count for a story
 */
storiesRouter.post(
  '/:id/view',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const session = getSession(req);
    if (!session) {
      res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }

    const storyId = parseInt(req.params.id);
    if (isNaN(storyId)) {
      res.status(400).json({ 
        message: 'Invalid story ID',
        code: 'INVALID_STORY_ID'
      });
      return;
    }

    try {
      await storiesService.incrementStoryViews(storyId);
      res.json({ message: 'View count incremented' });
    } catch (error: any) {
      console.error('Error incrementing story views:', error);
      res.status(500).json({ 
        message: 'Failed to increment view count',
        code: 'INTERNAL_ERROR'
      });
    }
  })
);

export default storiesRouter;
