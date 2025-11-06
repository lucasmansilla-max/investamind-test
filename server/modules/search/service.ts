import { db } from "../../config/db";
import { communityPosts, users, userBlocks } from "@shared/schema";
import { and, eq, sql, or, ilike, desc, isNull } from "drizzle-orm";
import { decodeCursor, encodeCursor, parsePaginationParams } from "../../utils/pagination";

export type SearchType = "auto" | "text" | "hashtag" | "ticker";

export interface SearchPostsParams {
  query: string;
  type: SearchType;
  userId: number;
  cursor?: string;
  limit?: number;
}

export interface SearchTagParams {
  tag: string;
  userId: number;
  cursor?: string;
  limit?: number;
}

export async function searchPosts(params: SearchPostsParams) {
  const { query, type, userId, cursor, limit: requestedLimit } = params;
  const { limit } = parsePaginationParams({ cursor, limit: requestedLimit?.toString() });

  // Get blocked user IDs
  const blockedUsers = await db
    .select({ blockedId: userBlocks.blockedId })
    .from(userBlocks)
    .where(eq(userBlocks.blockerId, userId));
  
  const blockedIds = blockedUsers.map(b => b.blockedId);

  // Build where conditions based on search type
  let whereConditions: any[] = [
    isNull(communityPosts.deletedAt),
  ];

  // Exclude blocked users
  if (blockedIds.length > 0) {
    whereConditions.push(sql`${communityPosts.userId} NOT IN (${sql.join(blockedIds.map(id => sql`${id}`), sql`, `)})`);
  }

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

  // Add search-specific conditions
  if (type === "hashtag") {
    // Search for hashtag in tags.hashtags array
    whereConditions.push(
      sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(${communityPosts.tags}::jsonb->'hashtags') AS ht
        WHERE ht = ${query.toLowerCase().replace(/^#/, '')}
      )`
    );
  } else if (type === "ticker") {
    // Search for ticker in tags.tickers array
    whereConditions.push(
      sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(${communityPosts.tags}::jsonb->'tickers') AS tk
        WHERE tk = ${query.toUpperCase().replace(/^\$/, '')}
      )`
    );
  } else {
    // Text search using ILIKE (pg_trgm will optimize this)
    whereConditions.push(ilike(communityPosts.content, `%${query}%`));
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

export async function searchByTag(params: SearchTagParams) {
  const { tag, userId, cursor, limit: requestedLimit } = params;
  const { limit } = parsePaginationParams({ cursor, limit: requestedLimit?.toString() });

  // Get blocked user IDs
  const blockedUsers = await db
    .select({ blockedId: userBlocks.blockedId })
    .from(userBlocks)
    .where(eq(userBlocks.blockerId, userId));
  
  const blockedIds = blockedUsers.map(b => b.blockedId);

  // Build where conditions
  let whereConditions: any[] = [
    isNull(communityPosts.deletedAt),
    // Search for tag in tags.hashtags array
    sql`EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(${communityPosts.tags}::jsonb->'hashtags') AS ht
      WHERE ht = ${tag.toLowerCase().replace(/^#/, '')}
    )`,
  ];

  // Exclude blocked users
  if (blockedIds.length > 0) {
    whereConditions.push(sql`${communityPosts.userId} NOT IN (${sql.join(blockedIds.map(id => sql`${id}`), sql`, `)})`);
  }

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
