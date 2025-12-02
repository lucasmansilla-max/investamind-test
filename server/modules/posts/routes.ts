/**
 * Posts routes module
 * Handles HTTP endpoints for post management
 */

import { Router, type Request, Response } from 'express';
import * as postsService from './service';
import { asyncHandler } from '../../middlewares/error';
import commentsRouter from '../comments/routes';
import { isAdmin } from '../../utils/roles';
import { db } from '../../config/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import {
  createPostSchema,
  updatePostSchema,
  feedQuerySchema,
  idParamSchema,
  validateRequest,
} from '../../utils/validation';

export const postsRouter = Router();

// Mount comments routes under posts
postsRouter.use('/', commentsRouter);

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
postsRouter.post(
  '/',
  validateRequest(createPostSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const session = getSession(req);
    if (!session) {
      res.status(401).json({ 
        message: 'Debes iniciar sesión para crear un post.',
        code: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }
  
    const { body, imageUrl, messageType, postType } = req.body;
  
    // Get Socket.IO instance from app
    const io = (req.app as any).io;

    const post = await postsService.createPost({
      userId: session.userId,
      body,
      imageUrl: imageUrl || undefined,
      messageType,
      postType,
      io,
    });
  
    res.status(201).json(post);
  })
);

/**
 * PATCH /posts/:id
 * Update a post (owner only)
 */
postsRouter.patch(
  '/:id',
  validateRequest(idParamSchema, 'params'),
  validateRequest(updatePostSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const session = getSession(req);
    if (!session) {
      res.status(401).json({ 
        message: 'Debes iniciar sesión para actualizar un post.',
        code: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }
  
    const postId = req.params.id as unknown as number;
  
    try {
      const post = await postsService.updatePost(postId, session.userId, req.body);
      res.json(post);
    } catch (error: any) {
      if (error.message === 'Post not found or unauthorized') {
        res.status(404).json({ 
          message: 'El post no fue encontrado o no tienes permisos para actualizarlo.',
          code: 'POST_NOT_FOUND_OR_UNAUTHORIZED'
        });
        return;
      }
      throw error;
    }
  })
);

/**
 * DELETE /posts/:id
 * Soft delete a post (owner only)
 */
postsRouter.delete(
  '/:id',
  validateRequest(idParamSchema, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const session = getSession(req);
    if (!session) {
      res.status(401).json({ 
        message: 'Debes iniciar sesión para eliminar un post.',
        code: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }
  
    const postId = req.params.id as unknown as number;
  
    try {
      const post = await postsService.deletePost(postId, session.userId);
      res.json({ message: 'Post eliminado exitosamente', post });
    } catch (error: any) {
      if (error.message === 'Post not found or unauthorized') {
        res.status(404).json({ 
          message: 'El post no fue encontrado o no tienes permisos para eliminarlo.',
          code: 'POST_NOT_FOUND_OR_UNAUTHORIZED'
        });
        return;
      }
      throw error;
    }
  })
);

/**
 * GET /feed/global
 * Get global feed with sorting and pagination
 */
postsRouter.get(
  '/feed/global',
  validateRequest(feedQuerySchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const session = getSession(req);
    if (!session) {
      res.status(401).json({ 
        message: 'Debes iniciar sesión para ver el feed.',
        code: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }
  
    const { sort, cursor, limit } = req.query as any;
  
    const result = await postsService.getGlobalFeed({
      userId: session.userId,
      sort,
      cursor,
      limit,
    });
  
    res.json(result);
  })
);

/**
 * GET /posts/:id
 * Get a single post (with Open Graph meta tags for sharing)
 */
postsRouter.get(
  '/:id',
  validateRequest(idParamSchema, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const postId = req.params.id as unknown as number;

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
      res.status(404).json({ 
        message: 'El post solicitado no fue encontrado.',
        code: 'POST_NOT_FOUND'
      });
      return;
    }
    throw error;
  }
  })
);

/**
 * POST /posts/:id/deactivate
 * Deactivate a post (admin only)
 */
postsRouter.post(
  '/:id/deactivate',
  validateRequest(idParamSchema, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const session = getSession(req);
    if (!session) {
      res.status(401).json({ 
        message: 'Debes iniciar sesión para desactivar un post.',
        code: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }
  
    // Verify admin
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);
  
    if (!isAdmin(user)) {
      res.status(403).json({ 
        message: 'Solo los administradores pueden desactivar posts.',
        code: 'ADMIN_ACCESS_REQUIRED'
      });
      return;
    }
  
    const postId = req.params.id as unknown as number;
  
    try {
      const post = await postsService.deactivatePost(postId, session.userId);
      res.json({ message: 'Post desactivado exitosamente', post });
    } catch (error: any) {
      if (error.message === 'Post not found') {
        res.status(404).json({ 
          message: 'El post solicitado no fue encontrado.',
          code: 'POST_NOT_FOUND'
        });
        return;
      }
      if (error.message.includes('Unauthorized')) {
        res.status(403).json({ 
          message: 'No tienes permisos para realizar esta acción.',
          code: 'UNAUTHORIZED'
        });
        return;
      }
      throw error;
    }
  })
);

export default postsRouter;
