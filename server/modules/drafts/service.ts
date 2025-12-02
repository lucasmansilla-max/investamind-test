import { db } from "../../config/db";
import { drafts } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import type { Draft, InsertDraft } from "@shared/schema";
import type { Server as SocketIOServer } from "socket.io";

export interface CreateDraftParams {
  userId: number;
  body: string;
  imageUrl?: string;
}

export interface UpdateDraftParams {
  id: number;
  userId: number;
  body?: string;
  imageUrl?: string;
}

export interface DeleteDraftParams {
  id: number;
  userId: number;
}

export interface PublishDraftParams {
  id: number;
  userId: number;
  io?: SocketIOServer;
}

export async function createDraft({
  userId,
  body,
  imageUrl,
}: CreateDraftParams): Promise<Draft> {
  const [draft] = await db
    .insert(drafts)
    .values({
      userId,
      body,
      imageUrl,
    })
    .returning();

  return draft;
}

export async function getDrafts(userId: number): Promise<Draft[]> {
  return db.query.drafts.findMany({
    where: eq(drafts.userId, userId),
    orderBy: [desc(drafts.updatedAt)],
  });
}

export async function getDraft(id: number, userId: number): Promise<Draft | null> {
  const draft = await db.query.drafts.findFirst({
    where: and(eq(drafts.id, id), eq(drafts.userId, userId)),
  });

  return draft || null;
}

export async function updateDraft({
  id,
  userId,
  body,
  imageUrl,
}: UpdateDraftParams): Promise<Draft> {
  const draft = await getDraft(id, userId);
  if (!draft) {
    throw new Error("Draft not found");
  }

  const updates: Partial<Pick<Draft, 'body' | 'imageUrl' | 'updatedAt'>> = {
    updatedAt: new Date(),
  };

  if (body !== undefined) {
    updates.body = body;
  }
  if (imageUrl !== undefined) {
    updates.imageUrl = imageUrl;
  }

  const [updated] = await db
    .update(drafts)
    .set(updates)
    .where(and(eq(drafts.id, id), eq(drafts.userId, userId)))
    .returning();

  return updated;
}

export async function deleteDraft({ id, userId }: DeleteDraftParams): Promise<void> {
  await db.delete(drafts).where(and(eq(drafts.id, id), eq(drafts.userId, userId)));
}

export async function publishDraft({
  id,
  userId,
  io,
}: PublishDraftParams): Promise<any> {
  const draft = await getDraft(id, userId);
  if (!draft) {
    throw new Error("Draft not found");
  }

  // Use posts service to create the post
  const { createPost } = await import("../posts/service");

  // Atomic transaction: create post and delete draft
  return await db.transaction(async (tx) => {
    // Create post using the transaction context
    const post = await createPost({
      userId,
      body: draft.body,
      imageUrl: draft.imageUrl || undefined,
      io,
    });

    // Delete the draft within same transaction
    await tx.delete(drafts).where(and(eq(drafts.id, id), eq(drafts.userId, userId)));

    return post;
  });
}
