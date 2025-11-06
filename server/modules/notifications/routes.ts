/**
 * Notifications routes
 * Handles notification endpoints
 */

import { Router } from 'express';
import { getNotifications, markAsRead, getUnreadCount } from './service';
import { z } from 'zod';

const router = Router();

// Helper to get session from global sessions map
function getSession(req: any) {
  const sessions = (global as any).__sessions;
  const sessionId = req.cookies?.sessionId;
  
  if (!sessionId) {
    return null;
  }
  
  return sessions.get(sessionId);
}

/**
 * GET /api/notifications
 * Get user notifications with cursor pagination (unread first)
 */
router.get('/', async (req, res) => {
  try {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const cursor = req.query.cursor as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    const result = await getNotifications({
      userId: session.userId,
      cursor,
      limit,
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
router.get('/unread-count', async (req, res) => {
  try {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const count = await getUnreadCount(session.userId);

    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Failed to fetch unread count' });
  }
});

/**
 * POST /api/notifications/read
 * Mark notifications as read
 * Body: { ids: string[] }
 */
router.post('/read', async (req, res) => {
  try {
    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const schema = z.object({
      ids: z.array(z.string()).min(1, 'At least one notification ID required'),
    });

    const { ids } = schema.parse(req.body);

    const result = await markAsRead({
      userId: session.userId,
      ids,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error marking notifications as read:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
    }
    res.status(500).json({ message: 'Failed to mark notifications as read' });
  }
});

export default router;
