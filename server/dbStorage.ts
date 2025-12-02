/**
 * Database-backed storage implementation using Drizzle ORM
 */

import { db } from "./config/db";
import {
  users,
  learningModules,
  userProgress,
  marketRecaps,
  notifications,
  communityPosts,
  subscriptions,
  payments,
  subscriptionHistory,
  postInteractions,
  userBlocks,
  passwordResetTokens,
  webhookLogs,
  type User,
  type InsertUser,
  type LearningModule,
  type InsertLearningModule,
  type UserProgress,
  type InsertUserProgress,
  type MarketRecap,
  type InsertMarketRecap,
  type Notification,
  type InsertNotification,
  type CommunityPost,
  type InsertCommunityPost,
  type Subscription,
  type InsertSubscription,
  type Payment,
  type InsertPayment,
  type SubscriptionHistory,
  type InsertSubscriptionHistory,
  type InsertPasswordResetToken,
  type PasswordResetToken,
  type InsertWebhookLog,
  type WebhookLog,
} from "@shared/schema";
import { eq, and, desc, isNull, notInArray, sql } from "drizzle-orm";
import { IStorage } from "./storage";
import bcrypt from "bcrypt";

export class DbStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Learning module operations
  async getAllModules(): Promise<LearningModule[]> {
    return await db.select().from(learningModules).orderBy(learningModules.orderIndex);
  }

  async getModule(id: number): Promise<LearningModule | undefined> {
    const [module] = await db.select().from(learningModules).where(eq(learningModules.id, id));
    return module;
  }

  async createModule(insertModule: InsertLearningModule): Promise<LearningModule> {
    // Normalize quizOptions to ensure they are string[] or null/undefined for Drizzle
    const normalizedModule = {
      ...insertModule,
      quizOptions: insertModule.quizOptions as string[] | null | undefined,
      quizOptionsEs: insertModule.quizOptionsEs as string[] | null | undefined,
    };
    const [module] = await db.insert(learningModules).values(normalizedModule).returning();
    return module;
  }

  // User progress operations
  async getUserProgress(userId: number): Promise<UserProgress[]> {
    return await db.select().from(userProgress).where(eq(userProgress.userId, userId));
  }

  async getModuleProgress(userId: number, moduleId: number): Promise<UserProgress | undefined> {
    const [progress] = await db
      .select()
      .from(userProgress)
      .where(and(eq(userProgress.userId, userId), eq(userProgress.moduleId, moduleId)));
    return progress;
  }

  async updateProgress(insertProgress: InsertUserProgress): Promise<UserProgress> {
    // Check if progress exists
    const existing = await this.getModuleProgress(insertProgress.userId, insertProgress.moduleId);
    
    if (existing) {
      // Update existing
      const [updated] = await db
        .update(userProgress)
        .set({
          ...insertProgress,
          completedAt: insertProgress.completed ? new Date() : null,
        })
        .where(and(
          eq(userProgress.userId, insertProgress.userId),
          eq(userProgress.moduleId, insertProgress.moduleId)
        ))
        .returning();
      return updated;
    } else {
      // Create new
      const [progress] = await db
        .insert(userProgress)
        .values({
          ...insertProgress,
          completedAt: insertProgress.completed ? new Date() : null,
        })
        .returning();
      return progress;
    }
  }

  // Market recap operations
  async getRecentRecaps(limit: number = 10): Promise<MarketRecap[]> {
    return await db
      .select()
      .from(marketRecaps)
      .orderBy(desc(marketRecaps.publishedAt))
      .limit(limit);
  }

  async createRecap(insertRecap: InsertMarketRecap): Promise<MarketRecap> {
    const [recap] = await db.insert(marketRecaps).values(insertRecap).returning();
    return recap;
  }

  // Notification operations
  async getUserNotifications(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(insertNotification).returning();
    return notification;
  }

  // Community post operations
  async getAllPosts(): Promise<CommunityPost[]> {
    return await db
      .select()
      .from(communityPosts)
      .where(isNull(communityPosts.deletedAt))
      .orderBy(desc(communityPosts.createdAt));
  }

  async createPost(insertPost: InsertCommunityPost): Promise<CommunityPost> {
    const [post] = await db.insert(communityPosts).values(insertPost).returning();
    return post;
  }

  async getPostById(id: number): Promise<CommunityPost | undefined> {
    const [post] = await db
      .select()
      .from(communityPosts)
      .where(and(eq(communityPosts.id, id), isNull(communityPosts.deletedAt)));
    return post;
  }

  async likePost(userId: number, postId: number): Promise<void> {
    // Create like interaction
    await db.insert(postInteractions).values({
      userId,
      postId,
      interactionType: "like",
    });
    
    // Increment like count
    await db
      .update(communityPosts)
      .set({ likesCount: sql`${communityPosts.likesCount} + 1` })
      .where(eq(communityPosts.id, postId));
  }

  async unlikePost(userId: number, postId: number): Promise<void> {
    // Soft delete like interaction
    await db
      .update(postInteractions)
      .set({ deletedAt: new Date() })
      .where(and(
        eq(postInteractions.userId, userId),
        eq(postInteractions.postId, postId),
        eq(postInteractions.interactionType, "like")
      ));
    
    // Decrement like count
    await db
      .update(communityPosts)
      .set({ likesCount: sql`${communityPosts.likesCount} - 1` })
      .where(eq(communityPosts.id, postId));
  }

  async isPostLiked(userId: number, postId: number): Promise<boolean> {
    const [interaction] = await db
      .select()
      .from(postInteractions)
      .where(and(
        eq(postInteractions.userId, userId),
        eq(postInteractions.postId, postId),
        eq(postInteractions.interactionType, "like"),
        isNull(postInteractions.deletedAt)
      ));
    return !!interaction;
  }

  async repostPost(userId: number, postId: number): Promise<void> {
    // Create repost interaction
    await db.insert(postInteractions).values({
      userId,
      postId,
      interactionType: "repost",
    });
    
    // Increment repost count
    await db
      .update(communityPosts)
      .set({ repostsCount: sql`${communityPosts.repostsCount} + 1` })
      .where(eq(communityPosts.id, postId));
  }

  async unrepostPost(userId: number, postId: number): Promise<void> {
    // Soft delete repost interaction
    await db
      .update(postInteractions)
      .set({ deletedAt: new Date() })
      .where(and(
        eq(postInteractions.userId, userId),
        eq(postInteractions.postId, postId),
        eq(postInteractions.interactionType, "repost")
      ));
    
    // Decrement repost count
    await db
      .update(communityPosts)
      .set({ repostsCount: sql`${communityPosts.repostsCount} - 1` })
      .where(eq(communityPosts.id, postId));
  }

  async isPostReposted(userId: number, postId: number): Promise<boolean> {
    const [interaction] = await db
      .select()
      .from(postInteractions)
      .where(and(
        eq(postInteractions.userId, userId),
        eq(postInteractions.postId, postId),
        eq(postInteractions.interactionType, "repost"),
        isNull(postInteractions.deletedAt)
      ));
    return !!interaction;
  }

  // Comment operations (stub - would need comments table)
  async getPostComments(postId: number): Promise<any[]> {
    return [];
  }

  async createComment(postId: number, userId: number, content: string): Promise<any> {
    return { id: 1, postId, userId, content, createdAt: new Date() };
  }

  // Block operations
  async blockUser(blockerId: number, blockedId: number): Promise<void> {
    await db.insert(userBlocks).values({ blockerId, blockedId });
  }

  async unblockUser(blockerId: number, blockedId: number): Promise<void> {
    await db
      .delete(userBlocks)
      .where(and(
        eq(userBlocks.blockerId, blockerId),
        eq(userBlocks.blockedId, blockedId)
      ));
  }

  async isUserBlocked(blockerId: number, blockedId: number): Promise<boolean> {
    const [block] = await db
      .select()
      .from(userBlocks)
      .where(and(
        eq(userBlocks.blockerId, blockerId),
        eq(userBlocks.blockedId, blockedId)
      ));
    return !!block;
  }

  async getBlockedUserIds(userId: number): Promise<number[]> {
    const blocks = await db
      .select({ blockedId: userBlocks.blockedId })
      .from(userBlocks)
      .where(eq(userBlocks.blockerId, userId));
    return blocks.map(b => b.blockedId);
  }

  // Paginated post operations
  async getPostsPaginated(params: {
    currentUserId: number;
    cursor?: { createdAt: Date; id: number };
    limit: number;
  }): Promise<CommunityPost[]> {
    const { currentUserId, cursor, limit } = params;
    
    const blockedIds = await this.getBlockedUserIds(currentUserId);
    
    let query = db
      .select()
      .from(communityPosts)
      .where(and(
        isNull(communityPosts.deletedAt),
        blockedIds.length > 0 ? notInArray(communityPosts.userId, blockedIds) : undefined
      ))
      .orderBy(desc(communityPosts.createdAt), desc(communityPosts.id))
      .limit(limit);
    
    return await query;
  }

  // Subscription operations
  async getUserSubscription(userId: number): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    return subscription;
  }

  async createSubscription(insertSubscription: InsertSubscription): Promise<Subscription> {
    const [subscription] = await db.insert(subscriptions).values(insertSubscription).returning();
    return subscription;
  }

  async updateSubscription(id: number, updates: Partial<Subscription>): Promise<Subscription> {
    const [subscription] = await db
      .update(subscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(subscriptions.id, id))
      .returning();
    return subscription;
  }

  // Payment operations
  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(insertPayment).returning();
    return payment;
  }

  async getPaymentHistory(subscriptionId: number): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.subscriptionId, subscriptionId))
      .orderBy(desc(payments.createdAt));
  }

  // Subscription history
  async addSubscriptionHistory(insertHistory: InsertSubscriptionHistory): Promise<SubscriptionHistory> {
    const [history] = await db.insert(subscriptionHistory).values(insertHistory).returning();
    return history;
  }

  // Password reset operations
  async createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<PasswordResetToken> {
    const [resetToken] = await db.insert(passwordResetTokens).values({
      userId,
      token,
      expiresAt,
    }).returning();
    return resetToken;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, token),
        eq(passwordResetTokens.used, false)
      ))
      .limit(1);
    
    // Check if token is expired
    if (resetToken && new Date(resetToken.expiresAt) < new Date()) {
      return undefined;
    }
    
    return resetToken;
  }

  async invalidatePasswordResetToken(token: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.token, token));
  }

  async updateUserPassword(userId: number, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  // Webhook log operations
  async createWebhookLog(log: InsertWebhookLog): Promise<WebhookLog> {
    try {
      const [webhookLog] = await db.insert(webhookLogs).values(log).returning();
      if (!webhookLog) {
        throw new Error("Failed to create webhook log: no record returned");
      }
      console.log("[Webhook Log] Created successfully:", {
        id: webhookLog.id,
        source: webhookLog.source,
        eventId: webhookLog.eventId || 'no-event-id',
        eventType: webhookLog.eventType,
        status: webhookLog.status,
      });
      return webhookLog;
    } catch (error: any) {
      console.error("[Webhook Log] Error creating in database:", {
        error: error.message,
        errorCode: error.code,
        stack: error.stack,
        logData: {
          source: log.source,
          eventId: log.eventId || 'no-event-id',
          eventType: log.eventType,
          userId: log.userId,
          status: log.status,
        },
      });
      throw error;
    }
  }

  async getWebhookLogs(params: { 
    limit?: number; 
    offset?: number; 
    source?: string; 
    status?: string 
  }): Promise<WebhookLog[]> {
    const { limit = 100, offset = 0, source, status } = params;
    
    const conditions = [];
    if (source) {
      conditions.push(eq(webhookLogs.source, source));
    }
    if (status) {
      conditions.push(eq(webhookLogs.status, status));
    }
    
    if (conditions.length > 0) {
      return await db
        .select()
        .from(webhookLogs)
        .where(and(...conditions))
        .orderBy(desc(webhookLogs.createdAt))
        .limit(limit)
        .offset(offset);
    } else {
      return await db
        .select()
        .from(webhookLogs)
        .orderBy(desc(webhookLogs.createdAt))
        .limit(limit)
        .offset(offset);
    }
  }

  async getWebhookLog(id: number): Promise<WebhookLog | undefined> {
    const [log] = await db.select().from(webhookLogs).where(eq(webhookLogs.id, id));
    return log;
  }

  async getWebhookLogByEventId(source: string, eventId: string): Promise<WebhookLog | undefined> {
    if (!eventId) {
      return undefined;
    }
    const [log] = await db
      .select()
      .from(webhookLogs)
      .where(and(eq(webhookLogs.source, source), eq(webhookLogs.eventId, eventId)));
    return log;
  }

  async updateWebhookLogStatus(
    id: number, 
    status: string, 
    errorMessage?: string,
    subscriptionId?: number
  ): Promise<void> {
    try {
      const updates: any = { 
        status, 
        errorMessage: errorMessage || null,
        processedAt: new Date()
      };
      
      if (subscriptionId !== undefined) {
        updates.subscriptionId = subscriptionId;
      }
      
      const result = await db
        .update(webhookLogs)
        .set(updates)
        .where(eq(webhookLogs.id, id))
        .returning();
      
      if (!result || result.length === 0) {
        console.warn("Webhook log update did not affect any rows:", { id, status });
      } else {
        console.log("[Webhook Log] Updated successfully:", {
          id: result[0].id,
          eventId: result[0].eventId || 'no-event-id',
          status: result[0].status,
          subscriptionId: result[0].subscriptionId,
        });
      }
    } catch (error: any) {
      console.error("[Webhook Log] Error updating status in database:", {
        error: error.message,
        errorCode: error.code,
        stack: error.stack,
        id,
        status,
        subscriptionId,
      });
      throw error;
    }
  }
}

export const dbStorage = new DbStorage();
