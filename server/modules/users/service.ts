import { db } from "../../config/db";
import { users, userFollows, userBlocks, communityPosts, notifications } from "@shared/schema";
import { and, eq, sql, or, desc, isNull, count } from "drizzle-orm";
import { decodeCursor, encodeCursor, parsePaginationParams } from "../../utils/pagination";

export interface FollowUserParams {
  followerId: number;
  followingId: number;
  io?: any; // Socket.IO instance for real-time notifications
}

export interface GetFollowersParams {
  userId: number;
  requesterId: number;
  cursor?: string;
  limit?: number;
}

export interface GetUserPostsParams {
  userId: number;
  requesterId: number;
  cursor?: string;
  limit?: number;
}

export async function followUser(params: FollowUserParams) {
  const { followerId, followingId, io } = params;

  // Prevent self-follow
  if (followerId === followingId) {
    throw new Error("Cannot follow yourself");
  }

  // Check if already following
  const existing = await db
    .select()
    .from(userFollows)
    .where(
      and(
        eq(userFollows.followerId, followerId),
        eq(userFollows.followingId, followingId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    throw new Error("Already following this user");
  }

  // Check if blocked
  const blocked = await db
    .select()
    .from(userBlocks)
    .where(
      or(
        and(
          eq(userBlocks.blockerId, followerId),
          eq(userBlocks.blockedId, followingId)
        ),
        and(
          eq(userBlocks.blockerId, followingId),
          eq(userBlocks.blockedId, followerId)
        )
      )
    )
    .limit(1);

  if (blocked.length > 0) {
    throw new Error("Cannot follow this user");
  }

  // Create follow relationship
  const [follow] = await db
    .insert(userFollows)
    .values({
      followerId,
      followingId,
    })
    .returning();

  // Get follower info for notification
  const [followerUser] = await db
    .select({
      firstName: users.firstName,
      lastName: users.lastName,
      username: users.username,
    })
    .from(users)
    .where(eq(users.id, followerId))
    .limit(1);

  // Create notification
  const [notification] = await db.insert(notifications).values({
    userId: followingId,
    title: "New Follower",
    message: `${followerUser.firstName || followerUser.username || 'Someone'} started following you`,
    type: "follow",
    sentAt: new Date(),
  }).returning();

  // Emit real-time notification via Socket.IO
  if (io && notification) {
    io.to(`user:${followingId}`).emit('notification', notification);
  }

  return follow;
}

export async function unfollowUser(params: FollowUserParams) {
  const { followerId, followingId } = params;

  const deleted = await db
    .delete(userFollows)
    .where(
      and(
        eq(userFollows.followerId, followerId),
        eq(userFollows.followingId, followingId)
      )
    )
    .returning();

  if (deleted.length === 0) {
    throw new Error("Not following this user");
  }

  return { success: true };
}

export async function getFollowers(params: GetFollowersParams) {
  const { userId, requesterId, cursor, limit: requestedLimit } = params;
  const { limit } = parsePaginationParams({ cursor, limit: requestedLimit?.toString() });

  // Get blocked user IDs
  const blockedUsers = await db
    .select({ blockedId: userBlocks.blockedId })
    .from(userBlocks)
    .where(eq(userBlocks.blockerId, requesterId));
  
  const blockedIds = blockedUsers.map(b => b.blockedId);

  // Build where conditions
  let whereConditions: any[] = [
    eq(userFollows.followingId, userId),
    isNull(users.deletedAt),
  ];

  // Exclude blocked users
  if (blockedIds.length > 0) {
    whereConditions.push(sql`${users.id} NOT IN (${sql.join(blockedIds.map(id => sql`${id}`), sql`, `)})`);
  }

  // Apply cursor-based pagination
  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      const cursorCreatedAt = decoded.createdAt;
      const cursorId = parseInt(decoded.id, 10);
      whereConditions.push(
        or(
          sql`${userFollows.createdAt} < ${cursorCreatedAt}`,
          and(
            sql`${userFollows.createdAt} = ${cursorCreatedAt}`,
            sql`${userFollows.id} < ${cursorId}`
          )
        )
      );
    }
  }

  // Execute query
  const followers = await db
    .select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      bio: users.bio,
      avatarUrl: users.avatarUrl,
      followedAt: userFollows.createdAt,
      followId: userFollows.id,
    })
    .from(userFollows)
    .innerJoin(users, eq(userFollows.followerId, users.id))
    .where(and(...whereConditions))
    .orderBy(desc(userFollows.createdAt), desc(userFollows.id))
    .limit(limit + 1);

  // Check if there are more results
  const hasMore = followers.length > limit;
  const results = hasMore ? followers.slice(0, limit) : followers;

  // Generate next cursor
  const nextCursor = hasMore && results.length > 0 && results[results.length - 1].followedAt
    ? encodeCursor({
        createdAt: results[results.length - 1].followedAt!.toISOString(),
        id: results[results.length - 1].followId!.toString()
      })
    : null;

  return {
    data: results,
    nextCursor,
    hasMore,
  };
}

export async function getFollowing(params: GetFollowersParams) {
  const { userId, requesterId, cursor, limit: requestedLimit } = params;
  const { limit } = parsePaginationParams({ cursor, limit: requestedLimit?.toString() });

  // Get blocked user IDs
  const blockedUsers = await db
    .select({ blockedId: userBlocks.blockedId })
    .from(userBlocks)
    .where(eq(userBlocks.blockerId, requesterId));
  
  const blockedIds = blockedUsers.map(b => b.blockedId);

  // Build where conditions
  let whereConditions: any[] = [
    eq(userFollows.followerId, userId),
    isNull(users.deletedAt),
  ];

  // Exclude blocked users
  if (blockedIds.length > 0) {
    whereConditions.push(sql`${users.id} NOT IN (${sql.join(blockedIds.map(id => sql`${id}`), sql`, `)})`);
  }

  // Apply cursor-based pagination
  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      const cursorCreatedAt = decoded.createdAt;
      const cursorId = parseInt(decoded.id, 10);
      whereConditions.push(
        or(
          sql`${userFollows.createdAt} < ${cursorCreatedAt}`,
          and(
            sql`${userFollows.createdAt} = ${cursorCreatedAt}`,
            sql`${userFollows.id} < ${cursorId}`
          )
        )
      );
    }
  }

  // Execute query
  const following = await db
    .select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      bio: users.bio,
      avatarUrl: users.avatarUrl,
      followedAt: userFollows.createdAt,
      followId: userFollows.id,
    })
    .from(userFollows)
    .innerJoin(users, eq(userFollows.followingId, users.id))
    .where(and(...whereConditions))
    .orderBy(desc(userFollows.createdAt), desc(userFollows.id))
    .limit(limit + 1);

  // Check if there are more results
  const hasMore = following.length > limit;
  const results = hasMore ? following.slice(0, limit) : following;

  // Generate next cursor
  const nextCursor = hasMore && results.length > 0 && results[results.length - 1].followedAt
    ? encodeCursor({
        createdAt: results[results.length - 1].followedAt!.toISOString(),
        id: results[results.length - 1].followId!.toString()
      })
    : null;

  return {
    data: results,
    nextCursor,
    hasMore,
  };
}

export async function getUserProfile(username: string, requesterId: number) {
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      bio: users.bio,
      avatarUrl: users.avatarUrl,
      experienceLevel: users.experienceLevel,
      investmentStyle: users.investmentStyle,
      isBetaUser: users.isBetaUser,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(eq(users.username, username), isNull(users.deletedAt)))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  // Get follower count
  const [followerCount] = await db
    .select({ count: count() })
    .from(userFollows)
    .where(eq(userFollows.followingId, user.id));

  // Get following count
  const [followingCount] = await db
    .select({ count: count() })
    .from(userFollows)
    .where(eq(userFollows.followerId, user.id));

  // Get post count
  const [postCount] = await db
    .select({ count: count() })
    .from(communityPosts)
    .where(and(eq(communityPosts.userId, user.id), isNull(communityPosts.deletedAt)));

  // Check if requester follows this user
  const [isFollowing] = await db
    .select()
    .from(userFollows)
    .where(
      and(
        eq(userFollows.followerId, requesterId),
        eq(userFollows.followingId, user.id)
      )
    )
    .limit(1);

  // Check if requester is followed by this user
  const [followsYou] = await db
    .select()
    .from(userFollows)
    .where(
      and(
        eq(userFollows.followerId, user.id),
        eq(userFollows.followingId, requesterId)
      )
    )
    .limit(1);

  return {
    ...user,
    followerCount: followerCount?.count || 0,
    followingCount: followingCount?.count || 0,
    postCount: postCount?.count || 0,
    isFollowing: !!isFollowing,
    followsYou: !!followsYou,
  };
}

export async function getUserPosts(params: GetUserPostsParams) {
  const { userId, requesterId, cursor, limit: requestedLimit } = params;
  const { limit } = parsePaginationParams({ cursor, limit: requestedLimit?.toString() });

  // Check if blocked
  const blocked = await db
    .select()
    .from(userBlocks)
    .where(
      or(
        and(
          eq(userBlocks.blockerId, requesterId),
          eq(userBlocks.blockedId, userId)
        ),
        and(
          eq(userBlocks.blockerId, userId),
          eq(userBlocks.blockedId, requesterId)
        )
      )
    )
    .limit(1);

  if (blocked.length > 0) {
    throw new Error("Cannot view posts from this user");
  }

  // Build where conditions
  let whereConditions: any[] = [
    eq(communityPosts.userId, userId),
    isNull(communityPosts.deletedAt),
  ];

  // Apply cursor-based pagination
  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      const cursorCreatedAt = decoded.createdAt;
      const cursorId = parseInt(decoded.id, 10);
      whereConditions.push(
        or(
          sql`${communityPosts.createdAt} < ${cursorCreatedAt}`,
          and(
            sql`${communityPosts.createdAt} = ${cursorCreatedAt}`,
            sql`${communityPosts.id} < ${cursorId}`
          )
        )
      );
    }
  }

  // Execute query
  const posts = await db
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
    .where(and(...whereConditions))
    .orderBy(desc(communityPosts.createdAt), desc(communityPosts.id))
    .limit(limit + 1);

  // Check if there are more results
  const hasMore = posts.length > limit;
  const results = hasMore ? posts.slice(0, limit) : posts;

  // Generate next cursor
  const nextCursor = hasMore && results.length > 0 && results[results.length - 1].createdAt
    ? encodeCursor({
        createdAt: results[results.length - 1].createdAt!.toISOString(),
        id: results[results.length - 1].id.toString()
      })
    : null;

  return {
    data: results,
    nextCursor,
    hasMore,
  };
}

export async function suggestUsers(query: string, limit: number = 10) {
  if (!query || query.length === 0) {
    return [];
  }

  // Search users by username prefix (case-insensitive)
  const results = await db
    .select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(
      and(
        sql`lower(${users.username}) LIKE ${query.toLowerCase() + '%'}`,
        isNull(users.deletedAt)
      )
    )
    .orderBy(users.username)
    .limit(limit);

  return results;
}
