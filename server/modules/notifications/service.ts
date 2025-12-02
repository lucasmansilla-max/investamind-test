/**
 * Notifications service
 * Handles notification CRUD operations with cursor pagination
 */

import { db } from '../../config/db';
import { notifications, users } from '@shared/schema';
import { eq, desc, and, inArray, or, sql } from 'drizzle-orm';
import { parsePaginationParams, encodeCursor, decodeCursor } from '../../utils/pagination';

export interface GetNotificationsParams {
  userId: number;
  cursor?: string;
  limit?: number;
}

export interface MarkAsReadParams {
  userId: number;
  ids: string[];
}

export interface CreateNotificationParams {
  userId: number;
  title: string;
  message: string;
  type: string;
}

/**
 * Get user notifications with cursor pagination
 * Unread notifications are shown first, then read notifications
 */
export async function getNotifications(params: GetNotificationsParams) {
  const { userId, cursor, limit: requestedLimit } = params;
  const { limit } = parsePaginationParams({ cursor, limit: requestedLimit?.toString() });

  // Build where conditions
  const whereConditions: any[] = [eq(notifications.userId, userId)];

  // Apply cursor-based pagination
  // For unread-first sorting, we need to handle the cursor differently
  if (cursor) {
    const decoded = decodeCursor(cursor) as any;
    if (decoded) {
      const cursorCreatedAt = decoded.createdAt;
      const cursorId = parseInt(decoded.id, 10);
      const cursorRead = decoded.read === 'true';

      // Pagination logic: unread first (read=false), then by createdAt desc, then by id desc
      // Build conditions without undefined values
      const conditions = [];

      // Condition 1: Unread notifications with (createdAt, id) < cursor
      conditions.push(
        and(
          sql`${notifications.read} = false`,
          or(
            sql`${notifications.createdAt} < ${cursorCreatedAt}`,
            and(
              sql`${notifications.createdAt} = ${cursorCreatedAt}`,
              sql`${notifications.id} < ${cursorId}`
            )
          )
        )
      );

      // Condition 2: If cursor was read, include read notifications with (createdAt, id) < cursor
      // If cursor was unread, include ALL read notifications (they come after all unreads)
      if (cursorRead) {
        conditions.push(
          and(
            sql`${notifications.read} = true`,
            or(
              sql`${notifications.createdAt} < ${cursorCreatedAt}`,
              and(
                sql`${notifications.createdAt} = ${cursorCreatedAt}`,
                sql`${notifications.id} < ${cursorId}`
              )
            )
          )
        );
      } else {
        // Cursor was unread, so include all read notifications
        conditions.push(sql`${notifications.read} = true`);
      }

      whereConditions.push(or(...conditions));
    }
  }

  // Execute query with unread-first sorting
  const results = await db
    .select({
      id: notifications.id,
      userId: notifications.userId,
      title: notifications.title,
      message: notifications.message,
      type: notifications.type,
      read: notifications.read,
      scheduledFor: notifications.scheduledFor,
      sentAt: notifications.sentAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(and(...whereConditions))
    .orderBy(
      // Unread first (false < true in SQL, so ascending order puts false first)
      notifications.read,
      // Then by createdAt descending (newest first)
      desc(notifications.createdAt),
      // Then by id descending for deterministic ordering
      desc(notifications.id)
    )
    .limit(limit + 1);

  // Check if there are more results
  const hasMore = results.length > limit;
  const data = hasMore ? results.slice(0, limit) : results;

  // Generate next cursor
  const nextCursor = hasMore && data.length > 0 && data[data.length - 1].createdAt
    ? encodeCursor({
        createdAt: data[data.length - 1].createdAt!.toISOString(),
        id: data[data.length - 1].id.toString(),
        read: data[data.length - 1].read ? 'true' : 'false',
      } as any)
    : null;

  return {
    data,
    nextCursor,
    hasMore,
  };
}

/**
 * Mark notifications as read
 */
export async function markAsRead(params: MarkAsReadParams) {
  const { userId, ids } = params;

  if (ids.length === 0) {
    return { updated: 0 };
  }

  // Convert string IDs to integers
  const numericIds = ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id));

  if (numericIds.length === 0) {
    throw new Error('Invalid notification IDs');
  }

  // Update only notifications belonging to this user
  const result = await db
    .update(notifications)
    .set({ read: true })
    .where(
      and(
        eq(notifications.userId, userId),
        inArray(notifications.id, numericIds)
      )
    );

  return { updated: numericIds.length };
}

/**
 * Create a new notification
 */
export async function createNotification(params: CreateNotificationParams) {
  const [notification] = await db
    .insert(notifications)
    .values({
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      read: false,
      sentAt: new Date(),
    })
    .returning();

  return notification;
}

/**
 * Helper function to create and emit a notification
 * This combines database creation with Socket.IO emission
 */
export async function createAndEmitNotification(
  params: CreateNotificationParams,
  io?: any
) {
  const notification = await createNotification(params);

  // Emit to user's Socket.IO room if io is provided
  if (io) {
    io.to(`user:${params.userId}`).emit('notification', notification);
  }

  return notification;
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: number): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      )
    );

  return result[0]?.count || 0;
}
