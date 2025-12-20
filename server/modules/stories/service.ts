/**
 * Stories service module
 * Handles business logic for stories operations
 */

import { db } from '../../config/db';
import { stories, storyLikes, users } from '@shared/schema';
import { eq, desc, and, sql, isNull } from 'drizzle-orm';

export interface CreateStoryInput {
  userId: number;
  content: string;
  imageData?: string;
  mimeType?: string;
  expiresAt?: Date;
}

export interface StoryWithUser {
  id: number;
  content: string;
  imageData: string | null;
  mimeType: string | null;
  expiresAt: Date | null;
  isActive: boolean;
  likesCount: number;
  viewsCount: number;
  createdAt: Date | null;
  user: {
    id: number;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    role: string | null;
  };
  isLikedByCurrentUser?: boolean;
}

/**
 * Create a new story
 */
export async function createStory(input: CreateStoryInput): Promise<StoryWithUser> {
  // Set expiration to 24 hours from now if not provided
  const expiresAt = input.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000);

  const [story] = await db
    .insert(stories)
    .values({
      userId: input.userId,
      content: input.content,
      imageData: input.imageData,
      mimeType: input.mimeType,
      expiresAt,
      isActive: true,
    })
    .returning();

  // Fetch user data
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      avatarUrl: users.avatarUrl,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, input.userId));

  return {
    ...story,
    user,
    isLikedByCurrentUser: false,
  };
}

/**
 * Get stories feed with pagination
 */
export async function getStoriesFeed(
  currentUserId: number,
  options: {
    cursor?: number;
    limit?: number;
  } = {}
): Promise<{ stories: StoryWithUser[]; nextCursor: number | null }> {
  const limit = Math.min(options.limit || 20, 50);
  const cursor = options.cursor || 2147483647; // PostgreSQL max integer

  // Query stories with user data and like status
  const storiesData = await db
    .select({
      id: stories.id,
      content: stories.content,
      imageData: stories.imageData,
      mimeType: stories.mimeType,
      expiresAt: stories.expiresAt,
      isActive: stories.isActive,
      likesCount: stories.likesCount,
      viewsCount: stories.viewsCount,
      createdAt: stories.createdAt,
      userId: stories.userId,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      avatarUrl: users.avatarUrl,
      role: users.role,
      isLiked: sql<boolean>`EXISTS (
        SELECT 1 FROM ${storyLikes}
        WHERE ${storyLikes.storyId} = ${stories.id}
        AND ${storyLikes.userId} = ${currentUserId}
      )`,
    })
    .from(stories)
    .innerJoin(users, eq(stories.userId, users.id))
    .where(
      and(
        eq(stories.isActive, true),
        sql`${stories.id} < ${cursor}`,
        // Only show non-expired stories or stories without expiration
        sql`(${stories.expiresAt} IS NULL OR ${stories.expiresAt} > NOW())`
      )
    )
    .orderBy(desc(stories.createdAt))
    .limit(limit + 1);

  const hasMore = storiesData.length > limit;
  const storiesResult = hasMore ? storiesData.slice(0, limit) : storiesData;
  const nextCursor = hasMore && storiesResult.length > 0
    ? storiesResult[storiesResult.length - 1].id
    : null;

  const formattedStories: StoryWithUser[] = storiesResult.map((s) => ({
    id: s.id,
    content: s.content,
    imageData: s.imageData,
    mimeType: s.mimeType,
    expiresAt: s.expiresAt,
    isActive: s.isActive,
    likesCount: s.likesCount,
    viewsCount: s.viewsCount,
    createdAt: s.createdAt,
    user: {
      id: s.userId,
      username: s.username,
      firstName: s.firstName,
      lastName: s.lastName,
      avatarUrl: s.avatarUrl,
      role: s.role,
    },
    isLikedByCurrentUser: s.isLiked,
  }));

  return {
    stories: formattedStories,
    nextCursor,
  };
}

/**
 * Get stories by a specific user
 */
export async function getUserStories(
  userId: number,
  currentUserId: number,
  options: {
    cursor?: number;
    limit?: number;
  } = {}
): Promise<{ stories: StoryWithUser[]; nextCursor: number | null }> {
  const limit = Math.min(options.limit || 20, 50);
  const cursor = options.cursor || 2147483647; // PostgreSQL max integer

  const storiesData = await db
    .select({
      id: stories.id,
      content: stories.content,
      imageData: stories.imageData,
      mimeType: stories.mimeType,
      expiresAt: stories.expiresAt,
      isActive: stories.isActive,
      likesCount: stories.likesCount,
      viewsCount: stories.viewsCount,
      createdAt: stories.createdAt,
      userId: stories.userId,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      avatarUrl: users.avatarUrl,
      role: users.role,
      isLiked: sql<boolean>`EXISTS (
        SELECT 1 FROM ${storyLikes}
        WHERE ${storyLikes.storyId} = ${stories.id}
        AND ${storyLikes.userId} = ${currentUserId}
      )`,
    })
    .from(stories)
    .innerJoin(users, eq(stories.userId, users.id))
    .where(
      and(
        eq(stories.userId, userId),
        eq(stories.isActive, true),
        sql`${stories.id} < ${cursor}`,
        sql`(${stories.expiresAt} IS NULL OR ${stories.expiresAt} > NOW())`
      )
    )
    .orderBy(desc(stories.createdAt))
    .limit(limit + 1);

  const hasMore = storiesData.length > limit;
  const storiesResult = hasMore ? storiesData.slice(0, limit) : storiesData;
  const nextCursor = hasMore && storiesResult.length > 0
    ? storiesResult[storiesResult.length - 1].id
    : null;

  const formattedStories: StoryWithUser[] = storiesResult.map((s) => ({
    id: s.id,
    content: s.content,
    imageData: s.imageData,
    mimeType: s.mimeType,
    expiresAt: s.expiresAt,
    isActive: s.isActive,
    likesCount: s.likesCount,
    viewsCount: s.viewsCount,
    createdAt: s.createdAt,
    user: {
      id: s.userId,
      username: s.username,
      firstName: s.firstName,
      lastName: s.lastName,
      avatarUrl: s.avatarUrl,
      role: s.role,
    },
    isLikedByCurrentUser: s.isLiked,
  }));

  return {
    stories: formattedStories,
    nextCursor,
  };
}

/**
 * Get a single story by ID
 */
export async function getStoryById(
  storyId: number,
  currentUserId: number
): Promise<StoryWithUser | null> {
  const [result] = await db
    .select({
      id: stories.id,
      content: stories.content,
      imageData: stories.imageData,
      mimeType: stories.mimeType,
      expiresAt: stories.expiresAt,
      isActive: stories.isActive,
      likesCount: stories.likesCount,
      viewsCount: stories.viewsCount,
      createdAt: stories.createdAt,
      userId: stories.userId,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      avatarUrl: users.avatarUrl,
      role: users.role,
      isLiked: sql<boolean>`EXISTS (
        SELECT 1 FROM ${storyLikes}
        WHERE ${storyLikes.storyId} = ${stories.id}
        AND ${storyLikes.userId} = ${currentUserId}
      )`,
    })
    .from(stories)
    .innerJoin(users, eq(stories.userId, users.id))
    .where(eq(stories.id, storyId));

  if (!result) {
    return null;
  }

  return {
    id: result.id,
    content: result.content,
    imageData: result.imageData,
    mimeType: result.mimeType,
    expiresAt: result.expiresAt,
    isActive: result.isActive,
    likesCount: result.likesCount,
    viewsCount: result.viewsCount,
    createdAt: result.createdAt,
    user: {
      id: result.userId,
      username: result.username,
      firstName: result.firstName,
      lastName: result.lastName,
      avatarUrl: result.avatarUrl,
      role: result.role,
    },
    isLikedByCurrentUser: result.isLiked,
  };
}

/**
 * Toggle like on a story
 */
export async function toggleStoryLike(
  storyId: number,
  userId: number
): Promise<{ liked: boolean; likesCount: number }> {
  // Check if the story exists and is active
  const [story] = await db
    .select()
    .from(stories)
    .where(eq(stories.id, storyId));

  if (!story || !story.isActive) {
    throw new Error('Story not found');
  }

  // Check if user already liked this story
  const [existingLike] = await db
    .select()
    .from(storyLikes)
    .where(
      and(
        eq(storyLikes.storyId, storyId),
        eq(storyLikes.userId, userId)
      )
    );

  let liked: boolean;
  let newLikesCount: number;

  if (existingLike) {
    // Unlike: Remove the like
    await db
      .delete(storyLikes)
      .where(
        and(
          eq(storyLikes.storyId, storyId),
          eq(storyLikes.userId, userId)
        )
      );

    // Decrement likes count
    const [updatedStory] = await db
      .update(stories)
      .set({
        likesCount: sql`GREATEST(0, ${stories.likesCount} - 1)`,
      })
      .where(eq(stories.id, storyId))
      .returning({ likesCount: stories.likesCount });

    liked = false;
    newLikesCount = updatedStory.likesCount;
  } else {
    // Like: Add the like
    await db
      .insert(storyLikes)
      .values({
        storyId,
        userId,
      });

    // Increment likes count
    const [updatedStory] = await db
      .update(stories)
      .set({
        likesCount: sql`${stories.likesCount} + 1`,
      })
      .where(eq(stories.id, storyId))
      .returning({ likesCount: stories.likesCount });

    liked = true;
    newLikesCount = updatedStory.likesCount;
  }

  return {
    liked,
    likesCount: newLikesCount,
  };
}

/**
 * Delete a story (soft delete by setting isActive to false)
 */
export async function deleteStory(storyId: number, userId: number): Promise<void> {
  const [story] = await db
    .select()
    .from(stories)
    .where(eq(stories.id, storyId));

  if (!story) {
    throw new Error('Story not found');
  }

  if (story.userId !== userId) {
    throw new Error('Unauthorized');
  }

  await db
    .update(stories)
    .set({ isActive: false })
    .where(eq(stories.id, storyId));
}

/**
 * Increment view count for a story
 */
export async function incrementStoryViews(storyId: number): Promise<void> {
  await db
    .update(stories)
    .set({
      viewsCount: sql`${stories.viewsCount} + 1`,
    })
    .where(eq(stories.id, storyId));
}
