import { db } from "../../config/db";
import { postComments, communityPosts, users } from "@shared/schema";
import { eq, and, isNull, desc, lt, or, inArray, sql } from "drizzle-orm";
import type { PostComment } from "@shared/schema";
import type { Server as SocketIOServer } from "socket.io";

interface CreateCommentParams {
  postId: number;
  userId: number;
  body: string;
  parentCommentId?: number;
  io?: SocketIOServer;
}

interface GetCommentsParams {
  postId: number;
  parentId?: number | null;
  cursor?: string;
  limit?: number;
  requesterId: number;
}

interface CommentWithUser extends PostComment {
  user: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
  };
}

export async function createComment({
  postId,
  userId,
  body,
  parentCommentId,
  io,
}: CreateCommentParams): Promise<CommentWithUser> {
  // Verify post exists
  const post = await db.query.communityPosts.findFirst({
    where: and(
      eq(communityPosts.id, postId),
      isNull(communityPosts.deletedAt)
    ),
  });

  if (!post) {
    throw new Error("Post not found");
  }

  // If it's a reply, verify parent comment exists
  if (parentCommentId) {
    const parentComment = await db.query.postComments.findFirst({
      where: and(
        eq(postComments.id, parentCommentId),
        eq(postComments.postId, postId),
        isNull(postComments.deletedAt)
      ),
    });

    if (!parentComment) {
      throw new Error("Parent comment not found");
    }
  }

  // Create comment
  const [comment] = await db
    .insert(postComments)
    .values({
      postId,
      userId,
      body,
      parentCommentId: parentCommentId || null,
    })
    .returning();

  // Increment post comment count if it's a top-level comment
  if (!parentCommentId) {
    await db
      .update(communityPosts)
      .set({
        commentsCount: post.commentsCount + 1,
      })
      .where(eq(communityPosts.id, postId));
  } else {
    // Increment parent comment replies count
    await db
      .update(postComments)
      .set({
        repliesCount: sql`${postComments.repliesCount} + 1`,
      })
      .where(eq(postComments.id, parentCommentId));
  }

  // Get user info
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
    },
  });

  // Emit notifications
  if (io) {
    const { createNotification } = await import("../notifications/service");

    // Notify post author (if not commenting on own post)
    if (post.userId !== userId) {
      const notification = await createNotification({
        userId: post.userId,
        type: "comment",
        title: `${user?.firstName || "Someone"} commented on your post`,
        message: body.substring(0, 100),
      });
      
      io.to(`user:${post.userId}`).emit("notification", notification);
    }

    // Notify parent comment author (if it's a reply and not replying to self)
    if (parentCommentId) {
      const parentComment = await db.query.postComments.findFirst({
        where: eq(postComments.id, parentCommentId),
      });

      if (parentComment && parentComment.userId !== userId) {
        const notification = await createNotification({
          userId: parentComment.userId,
          type: "comment",
          title: `${user?.firstName || "Someone"} replied to your comment`,
          message: body.substring(0, 100),
        });
        
        io.to(`user:${parentComment.userId}`).emit("notification", notification);
      }
    }
  }

  return {
    ...comment,
    user: user || {
      id: userId,
      firstName: null,
      lastName: null,
      username: null,
    },
  };
}

export async function getComments({
  postId,
  parentId = null,
  cursor,
  limit = 20,
  requesterId,
}: GetCommentsParams): Promise<{
  comments: CommentWithUser[];
  nextCursor: string | null;
}> {
  // Build WHERE conditions
  const conditions = [
    eq(postComments.postId, postId),
    isNull(postComments.deletedAt),
  ];

  // Filter by parent
  if (parentId === null) {
    conditions.push(isNull(postComments.parentCommentId));
  } else {
    conditions.push(eq(postComments.parentCommentId, parentId));
  }

  // Cursor pagination
  if (cursor) {
    const [cursorId, cursorCreatedAt] = cursor.split("_");
    conditions.push(
      or(
        lt(postComments.createdAt, new Date(parseInt(cursorCreatedAt))),
        and(
          eq(postComments.createdAt, new Date(parseInt(cursorCreatedAt))),
          lt(postComments.id, parseInt(cursorId))
        )
      )!
    );
  }

  const comments = await db.query.postComments.findMany({
    where: and(...conditions),
    orderBy: [desc(postComments.createdAt), desc(postComments.id)],
    limit: limit + 1,
  });

  const hasMore = comments.length > limit;
  const items = hasMore ? comments.slice(0, limit) : comments;

  const nextCursor = hasMore
    ? `${items[items.length - 1].id}_${items[items.length - 1].createdAt.getTime()}`
    : null;

  // Fetch users for all comments
  const userIds = items.map((c) => c.userId);
  const commentUsers = await db.query.users.findMany({
    where: inArray(users.id, userIds),
    columns: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
    },
  });

  const userMap = new Map(commentUsers.map((u) => [u.id, u]));

  return {
    comments: items.map((c) => ({
      ...c,
      user: userMap.get(c.userId) || {
        id: c.userId,
        firstName: null,
        lastName: null,
        username: null,
      },
    })),
    nextCursor,
  };
}
