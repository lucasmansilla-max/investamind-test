/**
 * Posts routes module
 * Handles HTTP endpoints for post management
 */

import { Router, type Request, Response } from 'express';
import { z } from 'zod';
import * as postsService from './service';
import { asyncHandler } from '../../middlewares/error';
import commentsRouter from '../comments/routes';

export const postsRouter = Router();

// Mount comments routes under posts
postsRouter.use('/', commentsRouter);

// Validation schemas
const createPostSchema = z.object({
  body: z.string().min(1).max(5000),
  imageUrl: z.string().url().optional(),
});

const updatePostSchema = z.object({
  body: z.string().min(1).max(5000).optional(),
  imageUrl: z.string().url().optional().nullable(),
});

const feedQuerySchema = z.object({
  sort: z.enum(['recent', 'popular', 'trending']).optional().default('recent'),
  cursor: z.string().optional(),
  limit: z.string().optional().transform(val => {
    if (!val) return 20;
    const num = parseInt(val, 10);
    return Math.min(Math.max(num, 1), 100);
  }),
});

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

/**
 * POST /posts
 * Create a new post
 */
postsRouter.post('/', asyncHandler(async (req: Request, res: Response) => {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }
  
  const validation = createPostSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({ 
      message: 'Invalid request data',
      errors: validation.error.errors,
    });
    return;
  }
  
  const { body, imageUrl } = validation.data;
  
  // Get Socket.IO instance from app
  const io = (req.app as any).io;

  const post = await postsService.createPost({
    userId: session.userId,
    body,
    imageUrl,
    io,
  });
  
  res.status(201).json(post);
}));

/**
 * PATCH /posts/:id
 * Update a post (owner only)
 */
postsRouter.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }
  
  const postId = parseInt(req.params.id, 10);
  if (isNaN(postId)) {
    res.status(400).json({ message: 'Invalid post ID' });
    return;
  }
  
  const validation = updatePostSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({ 
      message: 'Invalid request data',
      errors: validation.error.errors,
    });
    return;
  }
  
  try {
    const post = await postsService.updatePost(postId, session.userId, validation.data);
    res.json(post);
  } catch (error: any) {
    if (error.message === 'Post not found or unauthorized') {
      res.status(404).json({ message: error.message });
      return;
    }
    throw error;
  }
}));

/**
 * DELETE /posts/:id
 * Soft delete a post (owner only)
 */
postsRouter.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }
  
  const postId = parseInt(req.params.id, 10);
  if (isNaN(postId)) {
    res.status(400).json({ message: 'Invalid post ID' });
    return;
  }
  
  try {
    const post = await postsService.deletePost(postId, session.userId);
    res.json({ message: 'Post deleted successfully', post });
  } catch (error: any) {
    if (error.message === 'Post not found or unauthorized') {
      res.status(404).json({ message: error.message });
      return;
    }
    throw error;
  }
}));

/**
 * GET /feed/global
 * Get global feed with sorting and pagination
 */
postsRouter.get('/feed/global', asyncHandler(async (req: Request, res: Response) => {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }
  
  const validation = feedQuerySchema.safeParse(req.query);
  if (!validation.success) {
    res.status(400).json({ 
      message: 'Invalid query parameters',
      errors: validation.error.errors,
    });
    return;
  }
  
  const { sort, cursor, limit } = validation.data;
  
  const result = await postsService.getGlobalFeed({
    userId: session.userId,
    sort,
    cursor,
    limit,
  });
  
  res.json(result);
}));

/**
 * GET /posts/:id
 * Get a single post (with Open Graph meta tags for sharing)
 */
postsRouter.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const postId = parseInt(req.params.id, 10);
  if (isNaN(postId)) {
    res.status(400).json({ message: 'Invalid post ID' });
    return;
  }

  // Allow unauthenticated access for OG crawlers
  const session = getSession(req);
  const userId = session?.userId || 0;

  try {
    const post = await postsService.getPostById(postId, userId);
    
    // Check if request is from a bot/crawler (wants HTML)
    const acceptsHtml = req.accepts('html');
    
    if (acceptsHtml) {
      // Serve HTML with Open Graph meta tags
      const userName = post.user?.firstName || post.user?.username || 'A user';
      const postPreview = post.content.length > 200 
        ? post.content.substring(0, 200) + '...' 
        : post.content;
      const imageUrl = post.imageUrl || '';
      const siteUrl = process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
        : 'https://investamind.com';
      
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${userName} on Investamind</title>
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="${siteUrl}/posts/${post.id}">
  <meta property="og:title" content="${userName} on Investamind">
  <meta property="og:description" content="${postPreview.replace(/"/g, '&quot;')}">
  ${imageUrl ? `<meta property="og:image" content="${imageUrl}">` : ''}
  
  <!-- Twitter -->
  <meta name="twitter:card" content="${imageUrl ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:url" content="${siteUrl}/posts/${post.id}">
  <meta name="twitter:title" content="${userName} on Investamind">
  <meta name="twitter:description" content="${postPreview.replace(/"/g, '&quot;')}">
  ${imageUrl ? `<meta name="twitter:image" content="${imageUrl}">` : ''}
  
  <!-- Redirect to main app -->
  <meta http-equiv="refresh" content="0;url=${siteUrl}">
  <script>window.location.href = '${siteUrl}';</script>
</head>
<body>
  <p>Redirecting to Investamind...</p>
  <p>If you are not redirected, <a href="${siteUrl}">click here</a>.</p>
</body>
</html>`;
      
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } else {
      // Return JSON for API calls
      res.json(post);
    }
  } catch (error: any) {
    if (error.message === 'Post not found') {
      res.status(404).json({ message: 'Post not found' });
      return;
    }
    throw error;
  }
}));

export default postsRouter;
