/**
 * Posts service module
 * Handles post CRUD operations, hashtag/mention parsing, and scoring
 */

import { db } from '../../config/db';
import { communityPosts, userBlocks, users, notifications, postHashtags, postMentions } from '@shared/schema';
import { eq, and, isNull, desc, sql, notInArray, or, ne } from 'drizzle-orm';
import { extractHashtags, extractMentions, extractTickers } from '../../utils/parsing';
import { encodeCursor, decodeCursor, type Cursor } from '../../utils/pagination';
import { canViewTradingAlerts, isAdmin } from '../../utils/roles';

export interface CreatePostData {
  userId: number;
  body: string;
  imageUrl?: string;
  messageType?: string;
  postType?: string; // 'general', 'ad', 'advertisement' for admin posts
  io?: any; // Socket.IO instance for real-time notifications
}

export interface UpdatePostData {
  body?: string;
  imageUrl?: string | null;
}

export interface FeedOptions {
  userId: number;
  sort?: 'recent' | 'popular' | 'trending';
  cursor?: string;
  limit?: number;
}

/**
 * Calculate post score for popular/trending sorting
 * Formula: (likes*3 + comments*5 + reposts*4) / (1+hours)^1.3
 */
export const scorePost = (p: {
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  createdAt: Date;
}) => {
  const hours = (Date.now() - p.createdAt.getTime()) / 36e5;
  return (
    (p.likesCount * 3 + p.commentsCount * 5 + (p.repostsCount || 0) * 4) /
    Math.pow(1 + Math.max(0, hours), 1.3)
  );
};

/**
 * Get blocked user IDs for a user
 */
async function getBlockedUserIds(userId: number): Promise<number[]> {
  const blocks = await db
    .select({ blockedId: userBlocks.blockedId })
    .from(userBlocks)
    .where(eq(userBlocks.blockerId, userId));
  
  return blocks.map(b => b.blockedId);
}

/**
 * Resolve @mentions to user IDs using username
 */
async function resolveMentions(mentions: string[]): Promise<Map<string, number>> {
  if (mentions.length === 0) return new Map();
  
  const resolved = new Map<string, number>();
  
  // Query users by username
  for (const mention of mentions) {
    const user = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(sql`lower(${users.username}) = ${mention.toLowerCase()}`)
      .limit(1);
    
    if (user.length > 0) {
      resolved.set(mention, user[0].id);
    }
  }
  
  return resolved;
}

/**
 * Upsert hashtags for a post
 */
async function upsertHashtags(postId: number, hashtags: string[]) {
  // Always delete existing hashtags first
  await db.delete(postHashtags).where(eq(postHashtags.postId, postId));
  
  // If no new hashtags, we're done (existing ones are deleted)
  if (hashtags.length === 0) return;
  
  // Insert new hashtags
  const values = hashtags.map(tag => ({
    postId,
    hashtag: tag.toLowerCase(),
  }));
  
  await db.insert(postHashtags).values(values);
}

/**
 * Upsert mentions for a post
 */
async function upsertMentions(postId: number, mentionMap: Map<string, number>) {
  // Always delete existing mentions first
  await db.delete(postMentions).where(eq(postMentions.postId, postId));
  
  // If no new mentions, we're done (existing ones are deleted)
  if (mentionMap.size === 0) return;
  
  // Insert new mentions
  const values = Array.from(mentionMap.entries()).map(([handle, userId]) => ({
    postId,
    userId,
    handle: handle.toLowerCase(),
  }));
  
  await db.insert(postMentions).values(values);
}

/**
 * Create a new post
 */
export async function createPost(data: CreatePostData) {
  const { userId, body, imageUrl, messageType, postType, io } = data;
  
  // If postType is 'ad' or 'advertisement', verify user is admin
  if (postType === 'ad' || postType === 'advertisement') {
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!isAdmin(user)) {
      throw new Error('Unauthorized: Only admins can publish ads');
    }
  }
  
  // Parse content
  const hashtags = extractHashtags(body);
  const mentions = extractMentions(body);
  const tickers = extractTickers(body);
  
  // Resolve mentions to user IDs
  const mentionUserIds = await resolveMentions(mentions);
  
  // Create post
  const [post] = await db
    .insert(communityPosts)
    .values({
      userId,
      content: body,
      imageUrl,
      messageType: messageType || null,
      postType: postType || 'general',
      tags: {
        hashtags,
        mentions: Array.from(mentionUserIds.entries()).map(([handle, id]) => ({ handle, userId: id })),
        tickers,
      },
    })
    .returning();
  
  // Upsert hashtags and mentions to separate tables
  await upsertHashtags(post.id, hashtags);
  await upsertMentions(post.id, mentionUserIds);
  
  // Send mention notifications
  if (mentionUserIds.size > 0) {
    // Get author info for notification message
    const [author] = await db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const authorName = author.firstName || author.username || 'Someone';

    // Create and emit notifications for each mentioned user
    for (const [handle, mentionedUserId] of Array.from(mentionUserIds.entries())) {
      // Don't notify if user mentions themselves
      if (mentionedUserId === userId) continue;

      const [notification] = await db.insert(notifications).values({
        userId: mentionedUserId,
        title: "You were mentioned",
        message: `${authorName} mentioned you in a post`,
        type: "mention",
        sentAt: new Date(),
      }).returning();

      // Emit real-time notification via Socket.IO
      if (io && notification) {
        io.to(`user:${mentionedUserId}`).emit('notification', notification);
      }
    }
  }
  
  return post;
}

/**
 * Update a post (owner only)
 */
export async function updatePost(postId: number, userId: number, data: UpdatePostData) {
  // Check ownership
  const [existing] = await db
    .select()
    .from(communityPosts)
    .where(and(
      eq(communityPosts.id, postId),
      eq(communityPosts.userId, userId),
      isNull(communityPosts.deletedAt)
    ));
  
  if (!existing) {
    throw new Error('Post not found or unauthorized');
  }
  
  const updates: any = {
    updatedAt: new Date(),
  };
  
  if (data.body !== undefined) {
    updates.content = data.body;
    
    // Re-parse content
    const hashtags = extractHashtags(data.body);
    const mentions = extractMentions(data.body);
    const tickers = extractTickers(data.body);
    const mentionUserIds = await resolveMentions(mentions);
    
    updates.tags = {
      hashtags,
      mentions: Array.from(mentionUserIds.entries()).map(([handle, id]) => ({ handle, userId: id })),
      tickers,
    };
    
    // Update hashtags and mentions in separate tables
    await upsertHashtags(postId, hashtags);
    await upsertMentions(postId, mentionUserIds);
  }
  
  if (data.imageUrl !== undefined) {
    updates.imageUrl = data.imageUrl || null;
  }
  
  const [updated] = await db
    .update(communityPosts)
    .set(updates)
    .where(eq(communityPosts.id, postId))
    .returning();
  
  return updated;
}

/**
 * Soft delete a post (owner only)
 */
export async function deletePost(postId: number, userId: number) {
  // Check ownership
  const [existing] = await db
    .select()
    .from(communityPosts)
    .where(and(
      eq(communityPosts.id, postId),
      eq(communityPosts.userId, userId),
      isNull(communityPosts.deletedAt)
    ));
  
  if (!existing) {
    throw new Error('Post not found or unauthorized');
  }
  
  // Soft delete
  const [deleted] = await db
    .update(communityPosts)
    .set({ deletedAt: new Date() })
    .where(eq(communityPosts.id, postId))
    .returning();
  
  return deleted;
}

/**
 * Deactivate a post (admin only)
 */
export async function deactivatePost(postId: number, adminUserId: number) {
  // Verify admin
  const [adminUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, adminUserId))
    .limit(1);
  
  if (!isAdmin(adminUser)) {
    throw new Error('Unauthorized: Admin access required');
  }
  
  // Check if post exists
  const [existing] = await db
    .select()
    .from(communityPosts)
    .where(and(
      eq(communityPosts.id, postId),
      isNull(communityPosts.deletedAt)
    ));
  
  if (!existing) {
    throw new Error('Post not found');
  }
  
  // Soft delete (deactivate)
  const [deactivated] = await db
    .update(communityPosts)
    .set({ deletedAt: new Date() })
    .where(eq(communityPosts.id, postId))
    .returning();
  
  return deactivated;
}

/**
 * Reactivate a post (admin only)
 */
export async function reactivatePost(postId: number, adminUserId: number) {
  // Verify admin
  const [adminUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, adminUserId))
    .limit(1);
  
  if (!isAdmin(adminUser)) {
    throw new Error('Unauthorized: Admin access required');
  }
  
  // Check if post exists (including deactivated ones)
  const [existing] = await db
    .select()
    .from(communityPosts)
    .where(eq(communityPosts.id, postId))
    .limit(1);
  
  if (!existing) {
    throw new Error('Post not found');
  }
  
  // Check if post is already active
  if (!existing.deletedAt) {
    throw new Error('Post is already active');
  }
  
  // Reactivate (remove deletedAt)
  const [reactivated] = await db
    .update(communityPosts)
    .set({ deletedAt: null })
    .where(eq(communityPosts.id, postId))
    .returning();
  
  return reactivated;
}

/**
 * Get a single post by ID
 */
export async function getPostById(postId: number, userId: number) {
  const [post] = await db
    .select({
      id: communityPosts.id,
      userId: communityPosts.userId,
      content: communityPosts.content,
      imageUrl: communityPosts.imageUrl,
      tags: communityPosts.tags,
      likesCount: communityPosts.likesCount,
      commentsCount: communityPosts.commentsCount,
      repostsCount: communityPosts.repostsCount,
      createdAt: communityPosts.createdAt,
      updatedAt: communityPosts.updatedAt,
      user: {
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(communityPosts)
    .leftJoin(users, eq(communityPosts.userId, users.id))
    .where(and(
      eq(communityPosts.id, postId),
      isNull(communityPosts.deletedAt)
    ))
    .limit(1);

  if (!post) {
    throw new Error('Post not found');
  }

  // Check if blocked
  const blockedUserIds = await getBlockedUserIds(userId);
  if (blockedUserIds.includes(post.userId)) {
    throw new Error('Post not found');
  }

  return post;
}

/**
 * Get global feed with sorting and pagination
 */
export async function getGlobalFeed(options: FeedOptions) {
  const { userId, sort = 'recent', cursor, limit = 20 } = options;
  
  // Get user to check role
  const [user] = await db
    .select({
      id: users.id,
      role: users.role,
      subscriptionStatus: users.subscriptionStatus,
      isBetaUser: users.isBetaUser,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  // Get blocked user IDs
  const blockedUserIds = await getBlockedUserIds(userId);
  
  // Check if user can view trading alerts
  const canViewAlerts = canViewTradingAlerts(user);
  
  // Decode cursor if provided
  let cursorData: Cursor | null = null;
  if (cursor) {
    cursorData = decodeCursor(cursor);
  }
  
  // Build base query - exclude deleted posts and blocked users
  if (sort === 'recent') {
    // Recent: sort by createdAt DESC
    let whereConditions = [
      isNull(communityPosts.deletedAt),
      blockedUserIds.length > 0 
        ? notInArray(communityPosts.userId, blockedUserIds)
        : undefined,
    ].filter(Boolean);
    
    // Filter out trading alerts for free users
    // Trading alerts are posts with messageType 'trading_alert' or 'signal'
    if (!canViewAlerts) {
      whereConditions.push(
        or(
          isNull(communityPosts.messageType),
          ne(communityPosts.messageType, 'trading_alert'),
          ne(communityPosts.messageType, 'signal')
        )
      );
    }
    
    // Apply cursor
    if (cursorData) {
      whereConditions.push(
        or(
          sql`${communityPosts.createdAt} < ${new Date(cursorData.createdAt)}`,
          and(
            sql`${communityPosts.createdAt} = ${new Date(cursorData.createdAt)}`,
            sql`${communityPosts.id} < ${parseInt(cursorData.id, 10)}`
          )
        )
      );
    }
    
    const results = await db
      .select()
      .from(communityPosts)
      .where(and(...whereConditions))
      .orderBy(desc(communityPosts.createdAt), desc(communityPosts.id))
      .limit(limit + 1); // +1 to check if there are more results
    
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;
    
    return {
      data,
      nextCursor: hasMore && data.length > 0 && data[data.length - 1].createdAt
        ? encodeCursor({
            createdAt: data[data.length - 1].createdAt!.toISOString(),
            id: data[data.length - 1].id.toString(),
          })
        : null,
      hasMore,
    };
  } else {
    // For popular/trending, we need to fetch and sort in-memory
    // This is less efficient but necessary for the scoring algorithm
    let whereConditions = [
      isNull(communityPosts.deletedAt),
      blockedUserIds.length > 0 
        ? notInArray(communityPosts.userId, blockedUserIds)
        : undefined,
    ].filter(Boolean);
    
    // Filter out trading alerts for free users
    if (!canViewAlerts) {
      whereConditions.push(
        or(
          isNull(communityPosts.messageType),
          ne(communityPosts.messageType, 'trading_alert'),
          ne(communityPosts.messageType, 'signal')
        )
      );
    }
    
    const allPosts = await db
      .select()
      .from(communityPosts)
      .where(and(...whereConditions));
    
    // Score and sort
    const scoredPosts = allPosts
      .map(post => ({
        ...post,
        score: scorePost({
          likesCount: post.likesCount || 0,
          commentsCount: post.commentsCount || 0,
          repostsCount: post.repostsCount || 0,
          createdAt: post.createdAt!,
        }),
      }))
      .sort((a, b) => b.score - a.score);
    
    // Apply cursor-based pagination
    let startIndex = 0;
    if (cursorData) {
      startIndex = scoredPosts.findIndex(
        post => 
          post.createdAt?.getTime() === new Date(cursorData.createdAt).getTime() &&
          post.id === parseInt(cursorData.id, 10)
      );
      if (startIndex >= 0) {
        startIndex += 1; // Start after cursor
      } else {
        startIndex = 0;
      }
    }
    
    const results = scoredPosts.slice(startIndex, startIndex + limit + 1);
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;
    
    return {
      data,
      nextCursor: hasMore && data.length > 0 && data[data.length - 1].createdAt
        ? encodeCursor({
            createdAt: data[data.length - 1].createdAt!.toISOString(),
            id: data[data.length - 1].id.toString(),
          })
        : null,
      hasMore,
    };
  }
}
