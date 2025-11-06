import { db } from "../../config/db";
import { userBlocks } from "@shared/schema";
import { eq, and, or } from "drizzle-orm";

export interface BlockUserParams {
  blockerId: number;
  blockedId: number;
}

export interface UnblockUserParams {
  blockerId: number;
  blockedId: number;
}

export async function blockUser({ blockerId, blockedId }: BlockUserParams): Promise<void> {
  if (blockerId === blockedId) {
    throw new Error("Cannot block yourself");
  }

  // Check if block already exists
  const existing = await db.query.userBlocks.findFirst({
    where: and(
      eq(userBlocks.blockerId, blockerId),
      eq(userBlocks.blockedId, blockedId)
    ),
  });

  if (existing) {
    return; // Already blocked
  }

  await db.insert(userBlocks).values({
    blockerId,
    blockedId,
  });
}

export async function unblockUser({ blockerId, blockedId }: UnblockUserParams): Promise<void> {
  await db
    .delete(userBlocks)
    .where(
      and(
        eq(userBlocks.blockerId, blockerId),
        eq(userBlocks.blockedId, blockedId)
      )
    );
}

export async function isBlocked(userId1: number, userId2: number): Promise<boolean> {
  const block = await db.query.userBlocks.findFirst({
    where: or(
      and(eq(userBlocks.blockerId, userId1), eq(userBlocks.blockedId, userId2)),
      and(eq(userBlocks.blockerId, userId2), eq(userBlocks.blockedId, userId1))
    ),
  });

  return !!block;
}

export async function getBlockedUserIds(userId: number): Promise<number[]> {
  const blocks = await db.query.userBlocks.findMany({
    where: or(
      eq(userBlocks.blockerId, userId),
      eq(userBlocks.blockedId, userId)
    ),
  });

  // Return all user IDs that are either blocked by the user or blocking the user
  const blockedIds = new Set<number>();
  blocks.forEach((block) => {
    if (block.blockerId === userId) {
      blockedIds.add(block.blockedId);
    } else {
      blockedIds.add(block.blockerId);
    }
  });

  return Array.from(blockedIds);
}
