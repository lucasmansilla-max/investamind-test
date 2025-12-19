import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, json, decimal, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: varchar("username", { length: 30 }).unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"), // Base64 encoded image data with data URI (data:image/jpeg;base64,...)
  selectedLanguage: text("selected_language").default("en"),
  experienceLevel: text("experience_level"), // principiante, intermedio, avanzado
  investmentStyle: text("investment_style"), // day-swing, long-term, both
  learningStreak: integer("learning_streak").default(0),
  totalLessonsCompleted: integer("total_lessons_completed").default(0),
  currentModule: text("current_module"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  isBetaUser: boolean("is_beta_user").default(false),
  betaStartDate: timestamp("beta_start_date"),
  subscriptionStatus: varchar("subscription_status", { length: 20 }).default("free"), // 'free', 'trial', 'premium'
  role: varchar("role", { length: 20 }).default("free"), // 'admin', 'free', 'premium', 'legacy'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const learningModules = pgTable("learning_modules", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  titleEs: text("title_es"),
  description: text("description").notNull(),
  descriptionEs: text("description_es"),
  orderIndex: integer("order_index").notNull().unique(), // Unique order index
  isPremium: boolean("is_premium").default(false), // Whether this module requires premium access
  createdAt: timestamp("created_at").defaultNow(),
});

// Videos within a module
export const moduleVideos = pgTable("module_videos", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").references(() => learningModules.id, { onDelete: "cascade" }).notNull(),
  videoUrl: text("video_url").notNull(), // YouTube video URL
  title: text("title").notNull(), // Video title
  titleEs: text("title_es"), // Video title in Spanish
  description: text("description"), // Optional video description
  descriptionEs: text("description_es"),
  videoOrder: integer("video_order").notNull(), // Order within the module (1, 2, 3, ...)
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueModuleVideoOrder: unique().on(table.moduleId, table.videoOrder),
}));

export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  moduleId: integer("module_id").references(() => learningModules.id).notNull(),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Progress for individual videos
export const userVideoProgress = pgTable("user_video_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  videoId: integer("video_id").references(() => moduleVideos.id, { onDelete: "cascade" }).notNull(),
  watchedSeconds: integer("watched_seconds").default(0), // Seconds watched
  totalSeconds: integer("total_seconds"), // Total video duration
  completionPercentage: integer("completion_percentage").default(0), // 0-100
  completed: boolean("completed").default(false), // Video fully watched
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueUserVideo: unique().on(table.userId, table.videoId),
}));

export const marketRecaps = pgTable("market_recaps", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  content: text("content"),
  publishedAt: timestamp("published_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // 'learning_reminder', 'achievement', 'general'
  read: boolean("read").default(false),
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Community features tables
export const communityPosts = pgTable("community_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  postType: varchar("post_type", { length: 50 }).default("general"),
  messageType: varchar("message_type", { length: 50 }),
  ticker: varchar("ticker", { length: 10 }),
  stockSymbol: varchar("stock_symbol", { length: 10 }),
  stockData: json("stock_data"),
  signalData: json("signal_data"),
  predictionData: json("prediction_data"),
  analysisType: varchar("analysis_type", { length: 50 }),
  xpReward: integer("xp_reward").default(0),
  tags: json("tags").default("[]"),
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  repostsCount: integer("reposts_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// Post hashtags for normalized hashtag tracking
export const postHashtags = pgTable("post_hashtags", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => communityPosts.id, { onDelete: "cascade" }).notNull(),
  hashtag: varchar("hashtag", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniquePostHashtag: unique().on(table.postId, table.hashtag),
}));

// Post mentions for tracking @mentions with resolved user IDs
export const postMentions = pgTable("post_mentions", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => communityPosts.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  handle: varchar("handle", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniquePostMention: unique().on(table.postId, table.userId),
}));

export const postInteractions = pgTable("post_interactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  postId: integer("post_id").references(() => communityPosts.id).notNull(),
  interactionType: varchar("interaction_type", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// Post comments for nested discussions
export const postComments = pgTable("post_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => communityPosts.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  parentCommentId: integer("parent_comment_id"),
  body: text("body").notNull(),
  likesCount: integer("likes_count").default(0),
  repliesCount: integer("replies_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// Stories feature tables
export const stories = pgTable("stories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  imageData: text("image_data"), // Base64 encoded image data
  mimeType: text("mime_type"), // MUY IMPORTANTE: image/jpeg, image/png, etc.
  // Stories are typically ephemeral (e.g., 24h). expiresAt can be used for cleanup/filtering.
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  likesCount: integer("likes_count").default(0),
  viewsCount: integer("views_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const storyLikes = pgTable("story_likes", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").references(() => stories.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Prevent duplicate likes per (story, user)
  uniqueStoryLike: unique().on(table.storyId, table.userId),
}));

// Drafts for saving posts before publishing
export const drafts = pgTable("drafts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  body: text("body").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  badgeType: varchar("badge_type", { length: 50 }).notNull(),
  earnedAt: timestamp("earned_at").defaultNow(),
  isActive: boolean("is_active").default(true),
});

export const userStats = pgTable("user_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  communityPoints: integer("community_points").default(0),
  totalPosts: integer("total_posts").default(0),
  totalLikes: integer("total_likes").default(0),
  predictionAccuracy: decimal("prediction_accuracy", { precision: 5, scale: 2 }).default("0"),
  currentStreak: integer("current_streak").default(0),
  helpfulAnswers: integer("helpful_answers").default(0),
  referralCount: integer("referral_count").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerUserId: integer("referrer_user_id").references(() => users.id).notNull(),
  referredUserId: integer("referred_user_id").references(() => users.id).notNull(),
  referralCode: varchar("referral_code", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  signupDate: timestamp("signup_date").defaultNow(),
  validationDate: timestamp("validation_date"),
  confirmationDate: timestamp("confirmation_date"),
  pointsAwarded: integer("points_awarded").default(0),
});

export const userBlocks = pgTable("user_blocks", {
  id: serial("id").primaryKey(),
  blockerId: integer("blocker_id").references(() => users.id).notNull(),
  blockedId: integer("blocked_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userFollows = pgTable("user_follows", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").references(() => users.id).notNull(),
  followingId: integer("following_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  firstName: true,
  lastName: true,
  selectedLanguage: true,
  experienceLevel: true,
  investmentStyle: true,
  onboardingCompleted: true,
});

export const insertLearningModuleSchema = createInsertSchema(learningModules).pick({
  title: true,
  titleEs: true,
  description: true,
  descriptionEs: true,
  orderIndex: true,
  isPremium: true,
});

export const insertModuleVideoSchema = createInsertSchema(moduleVideos).pick({
  moduleId: true,
  videoUrl: true,
  title: true,
  titleEs: true,
  description: true,
  descriptionEs: true,
  videoOrder: true,
});

export const insertUserVideoProgressSchema = createInsertSchema(userVideoProgress).pick({
  userId: true,
  videoId: true,
  watchedSeconds: true,
  totalSeconds: true,
  completionPercentage: true,
  completed: true,
});

export const insertUserProgressSchema = createInsertSchema(userProgress).pick({
  userId: true,
  moduleId: true,
  completed: true,
});

export const insertMarketRecapSchema = createInsertSchema(marketRecaps).pick({
  title: true,
  summary: true,
  content: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  title: true,
  message: true,
  type: true,
  scheduledFor: true,
});

// Stories insert schemas
export const insertStorySchema = createInsertSchema(stories).omit({
  id: true,
  likesCount: true,
  viewsCount: true,
  createdAt: true,
  isActive: true,
});

export const insertStoryLikeSchema = createInsertSchema(storyLikes).pick({
  storyId: true,
  userId: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertLearningModule = z.infer<typeof insertLearningModuleSchema>;
export type LearningModule = typeof learningModules.$inferSelect;
export type InsertModuleVideo = z.infer<typeof insertModuleVideoSchema>;
export type ModuleVideo = typeof moduleVideos.$inferSelect;
export type InsertUserVideoProgress = z.infer<typeof insertUserVideoProgressSchema>;
export type UserVideoProgress = typeof userVideoProgress.$inferSelect;

export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type UserProgress = typeof userProgress.$inferSelect;

export type InsertMarketRecap = z.infer<typeof insertMarketRecapSchema>;
export type MarketRecap = typeof marketRecaps.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type InsertStory = z.infer<typeof insertStorySchema>;
export type Story = typeof stories.$inferSelect;

export type InsertStoryLike = z.infer<typeof insertStoryLikeSchema>;
export type StoryLike = typeof storyLikes.$inferSelect;

// Community feature types
export const insertCommunityPostSchema = createInsertSchema(communityPosts).omit({
  id: true,
  likesCount: true,
  commentsCount: true,
  repostsCount: true,
  createdAt: true,
});

export const insertPostCommentSchema = createInsertSchema(postComments).omit({
  id: true,
  likesCount: true,
  repliesCount: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const insertDraftSchema = createInsertSchema(drafts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPostInteractionSchema = createInsertSchema(postInteractions).pick({
  userId: true,
  postId: true,
  interactionType: true,
});

export const insertUserBadgeSchema = createInsertSchema(userBadges).pick({
  userId: true,
  badgeType: true,
});

export const insertUserStatsSchema = createInsertSchema(userStats).pick({
  userId: true,
  communityPoints: true,
  totalPosts: true,
  totalLikes: true,
  predictionAccuracy: true,
  currentStreak: true,
  helpfulAnswers: true,
  referralCount: true,
});

export const insertReferralSchema = createInsertSchema(referrals).pick({
  referrerUserId: true,
  referredUserId: true,
  referralCode: true,
  status: true,
});

export type InsertCommunityPost = z.infer<typeof insertCommunityPostSchema>;
export type CommunityPost = typeof communityPosts.$inferSelect;

export type InsertPostComment = z.infer<typeof insertPostCommentSchema>;
export type PostComment = typeof postComments.$inferSelect;

export type InsertDraft = z.infer<typeof insertDraftSchema>;
export type Draft = typeof drafts.$inferSelect;

export type InsertPostInteraction = z.infer<typeof insertPostInteractionSchema>;
export type PostInteraction = typeof postInteractions.$inferSelect;

export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;
export type UserBadge = typeof userBadges.$inferSelect;

export type InsertUserStats = z.infer<typeof insertUserStatsSchema>;
export type UserStats = typeof userStats.$inferSelect;

export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;

// Subscription System Tables
export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  planType: varchar('plan_type', { length: 20 }).notNull(), // 'free', 'premium_monthly', 'premium_yearly'
  status: varchar('status', { length: 20 }).notNull(), // 'trial', 'active', 'canceled', 'past_due'
  stripeCustomerId: varchar('stripe_customer_id', { length: 100 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 100 }),
  paypalSubscriptionId: varchar('paypal_subscription_id', { length: 100 }),
  revenueCatSubscriptionId: varchar('revenuecat_subscription_id', { length: 100 }),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  trialStart: timestamp('trial_start'),
  trialEnd: timestamp('trial_end'),
  canceledAt: timestamp('canceled_at'),
  founderDiscount: boolean('founder_discount').default(false),
  discountPercent: integer('discount_percent').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  subscriptionId: integer('subscription_id').references(() => subscriptions.id).notNull(),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 100 }),
  paypalPaymentId: varchar('paypal_payment_id', { length: 100 }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  status: varchar('status', { length: 20 }).notNull(), // 'pending', 'succeeded', 'failed'
  paymentMethod: varchar('payment_method', { length: 20 }).notNull(), // 'stripe', 'paypal'
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow()
});

export const subscriptionHistory = pgTable('subscription_history', {
  id: serial('id').primaryKey(),
  subscriptionId: integer('subscription_id').references(() => subscriptions.id).notNull(),
  action: varchar('action', { length: 50 }).notNull(), // 'created', 'upgraded', 'downgraded', 'canceled', 'renewed'
  fromPlan: varchar('from_plan', { length: 20 }),
  toPlan: varchar('to_plan', { length: 20 }),
  effectiveDate: timestamp('effective_date').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow()
});

// Password Reset Tokens
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').default(false),
  createdAt: timestamp('created_at').defaultNow()
});

// Subscription schema types
export const insertSubscriptionSchema = createInsertSchema(subscriptions).pick({
  userId: true,
  planType: true,
  status: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  paypalSubscriptionId: true,
  revenueCatSubscriptionId: true,
  currentPeriodStart: true,
  currentPeriodEnd: true,
  trialStart: true,
  trialEnd: true,
  canceledAt: true,
  founderDiscount: true,
  discountPercent: true,
});

export const insertPaymentSchema = createInsertSchema(payments).pick({
  subscriptionId: true,
  stripePaymentIntentId: true,
  paypalPaymentId: true,
  amount: true,
  currency: true,
  status: true,
  paymentMethod: true,
  paidAt: true,
});

export const insertSubscriptionHistorySchema = createInsertSchema(subscriptionHistory).pick({
  subscriptionId: true,
  action: true,
  fromPlan: true,
  toPlan: true,
  effectiveDate: true,
  notes: true,
});

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export type InsertSubscriptionHistory = z.infer<typeof insertSubscriptionHistorySchema>;
export type SubscriptionHistory = typeof subscriptionHistory.$inferSelect;

// Password Reset Token schema types
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).pick({
  userId: true,
  token: true,
  expiresAt: true,
});

export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Webhook Logs Table
// Note: Unique constraint on (source, event_id) is enforced via partial unique index in migration
// This allows multiple NULL event_id values while preventing duplicates when event_id is present
export const webhookLogs = pgTable('webhook_logs', {
  id: serial('id').primaryKey(),
  source: varchar('source', { length: 50 }).notNull(), // 'revenuecat', 'stripe', etc.
  eventId: varchar('event_id', { length: 255 }), // Unique identifier for the event to prevent duplicates
  eventType: varchar('event_type', { length: 100 }).notNull(),
  payload: jsonb('payload').notNull().$type<Record<string, any>>(),
  userId: integer('user_id').references(() => users.id),
  subscriptionId: integer('subscription_id').references(() => subscriptions.id),
  status: varchar('status', { length: 20 }).notNull().default('received'), // 'received', 'processed', 'failed', 'invalid', 'duplicate'
  errorMessage: text('error_message'),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const insertWebhookLogSchema = createInsertSchema(webhookLogs).pick({
  source: true,
  eventId: true,
  eventType: true,
  payload: true,
  userId: true,
  subscriptionId: true,
  status: true,
  errorMessage: true,
  processedAt: true,
});

export type InsertWebhookLog = z.infer<typeof insertWebhookLogSchema>;
export type WebhookLog = typeof webhookLogs.$inferSelect;