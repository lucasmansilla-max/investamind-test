import {
  users,
  learningModules,
  moduleVideos,
  userProgress,
  userVideoProgress,
  marketRecaps,
  notifications,
  communityPosts,
  subscriptions,
  payments,
  subscriptionHistory,
  type User,
  type InsertUser,
  type LearningModule,
  type InsertLearningModule,
  type ModuleVideo,
  type InsertModuleVideo,
  type UserProgress,
  type InsertUserProgress,
  type UserVideoProgress,
  type InsertUserVideoProgress,
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
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  
  // Learning module operations
  getAllModules(): Promise<LearningModule[]>;
  getModule(id: number): Promise<LearningModule | undefined>;
  createModule(module: InsertLearningModule): Promise<LearningModule>;
  checkOrderIndexExists(orderIndex: number, excludeModuleId?: number): Promise<boolean>;
  
  // Module video operations
  getModuleVideos(moduleId: number): Promise<ModuleVideo[]>;
  createModuleVideo(video: InsertModuleVideo): Promise<ModuleVideo>;
  updateModuleVideo(videoId: number, updates: Partial<InsertModuleVideo>): Promise<ModuleVideo>;
  deleteModuleVideo(videoId: number): Promise<void>;
  
  // User progress operations
  getUserProgress(userId: number): Promise<UserProgress[]>;
  getModuleProgress(userId: number, moduleId: number): Promise<UserProgress | undefined>;
  updateProgress(progress: InsertUserProgress): Promise<UserProgress>;
  
  // User video progress operations
  getUserVideoProgress(userId: number, videoId: number): Promise<UserVideoProgress | undefined>;
  updateUserVideoProgress(progress: InsertUserVideoProgress): Promise<UserVideoProgress>;
  getUserVideoProgressSummary(userId: number): Promise<{
    totalVideosCompleted: number;
    totalVideosWatched: number;
    totalWatchTime: number;
    averageCompletionRate: number;
  }>;
  
  // Market recap operations
  getRecentRecaps(limit?: number): Promise<MarketRecap[]>;
  createRecap(recap: InsertMarketRecap): Promise<MarketRecap>;
  
  // Notification operations
  getUserNotifications(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  
  // Community post operations
  getAllPosts(): Promise<CommunityPost[]>;
  createPost(post: InsertCommunityPost): Promise<CommunityPost>;
  getPostById(id: number): Promise<CommunityPost | undefined>;
  likePost(userId: number, postId: number): Promise<void>;
  unlikePost(userId: number, postId: number): Promise<void>;
  isPostLiked(userId: number, postId: number): Promise<boolean>;
  repostPost(userId: number, postId: number): Promise<void>;
  unrepostPost(userId: number, postId: number): Promise<void>;
  isPostReposted(userId: number, postId: number): Promise<boolean>;
  
  // Comment operations
  getPostComments(postId: number): Promise<any[]>;
  createComment(postId: number, userId: number, content: string): Promise<any>;
  
  // Block operations
  blockUser(blockerId: number, blockedId: number): Promise<void>;
  unblockUser(blockerId: number, blockedId: number): Promise<void>;
  isUserBlocked(blockerId: number, blockedId: number): Promise<boolean>;
  getBlockedUserIds(userId: number): Promise<number[]>;
  
  // Paginated post operations
  getPostsPaginated(params: {
    currentUserId: number;
    cursor?: { createdAt: Date; id: number };
    limit: number;
  }): Promise<CommunityPost[]>;
  
  // Subscription operations
  getUserSubscription(userId: number): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, updates: Partial<Subscription>): Promise<Subscription>;
  
  // Payment operations
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentHistory(subscriptionId: number): Promise<Payment[]>;
  
  // Subscription history
  addSubscriptionHistory(history: InsertSubscriptionHistory): Promise<SubscriptionHistory>;
  
  // Password reset operations
  createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<any>;
  getPasswordResetToken(token: string): Promise<any | undefined>;
  invalidatePasswordResetToken(token: string): Promise<void>;
  updateUserPassword(userId: number, newPassword: string): Promise<void>;
  
  // Webhook log operations
  createWebhookLog(log: any): Promise<any>;
  getWebhookLogs(params: { limit?: number; offset?: number; source?: string; status?: string }): Promise<any[]>;
  getWebhookLog(id: number): Promise<any | undefined>;
  getWebhookLogByEventId(source: string, eventId: string): Promise<any | undefined>;
  updateWebhookLogStatus(id: number, status: string, errorMessage?: string, subscriptionId?: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private modules: Map<number, LearningModule>;
  private moduleVideos: Map<number, ModuleVideo>;
  private progress: Map<string, UserProgress>;
  private videoProgress: Map<string, UserVideoProgress>; // key: "userId-videoId"
  private recaps: Map<number, MarketRecap>;
  private notifications: Map<number, Notification>;
  private posts: Map<number, CommunityPost>;
  private postLikes: Map<string, boolean>; // key: "userId-postId"
  private postReposts: Map<string, boolean>; // key: "userId-postId"
  private comments: Map<number, any[]>; // key: postId, value: comments array
  private subscriptions: Map<number, Subscription>;
  private payments: Map<number, Payment>;
  private subscriptionHistoryMap: Map<number, SubscriptionHistory>;
  private passwordResetTokens: Map<string, any>; // key: token, value: { id, userId, token, expiresAt, used, createdAt }
  private webhookLogs: Map<number, any>; // WebhookLog
  private currentUserId: number;
  private currentModuleId: number;
  private currentVideoId: number;
  private currentProgressId: number;
  private currentVideoProgressId: number;
  private currentRecapId: number;
  private currentNotificationId: number;
  private currentPostId: number;
  private currentSubscriptionId: number;
  private currentPaymentId: number;
  private currentHistoryId: number;
  private currentPasswordResetTokenId: number;
  private currentWebhookLogId: number;

  constructor() {
    this.users = new Map();
    this.modules = new Map();
    this.moduleVideos = new Map();
    this.progress = new Map();
    this.videoProgress = new Map();
    this.recaps = new Map();
    this.notifications = new Map();
    this.posts = new Map();
    this.postLikes = new Map();
    this.postReposts = new Map();
    this.comments = new Map();
    this.subscriptions = new Map();
    this.payments = new Map();
    this.subscriptionHistoryMap = new Map();
    this.passwordResetTokens = new Map();
    this.webhookLogs = new Map();
    this.currentUserId = 1;
    this.currentModuleId = 1;
    this.currentVideoId = 1;
    this.currentProgressId = 1;
    this.currentVideoProgressId = 1;
    this.currentRecapId = 1;
    this.currentNotificationId = 1;
    this.currentPostId = 1;
    this.currentSubscriptionId = 1;
    this.currentPaymentId = 1;
    this.currentHistoryId = 1;
    this.currentPasswordResetTokenId = 1;
    this.currentWebhookLogId = 1;
    
    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // No hardcoded modules - all modules will be created by admin through the UI

    // Create market recaps
    const recapData = [
      {
        title: "Tech Stocks Rally Continues",
        summary: "Major tech companies saw significant gains this week as investors showed renewed confidence in the sector following strong earnings reports.",
        content: "Technology stocks led the market higher this week...",
      },
      {
        title: "Fed Rate Decision Impact",
        summary: "The Federal Reserve's latest interest rate decision brought mixed signals to the market, with bond yields fluctuating throughout the week.",
        content: "Federal Reserve officials signaled...",
      },
      {
        title: "Energy Sector Updates",
        summary: "Oil prices stabilized this week following OPEC's announcement about production quotas, affecting energy sector investments.",
        content: "Energy markets responded positively...",
      }
    ];

    recapData.forEach(data => {
      const recap: MarketRecap = {
        id: this.currentRecapId++,
        title: data.title,
        summary: data.summary,
        content: data.content || null,
        publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last week
        createdAt: new Date(),
      };
      this.recaps.set(recap.id, recap);
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      id,
      email: insertUser.email,
      username: null,
      password: insertUser.password,
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null,
      bio: null,
      avatarUrl: null,
      selectedLanguage: insertUser.selectedLanguage || null,
      experienceLevel: insertUser.experienceLevel || null,
      investmentStyle: insertUser.investmentStyle || null,
      learningStreak: 0,
      totalLessonsCompleted: 0,
      currentModule: null,
      onboardingCompleted: insertUser.onboardingCompleted || false,
      isBetaUser: false,
      betaStartDate: null,
      subscriptionStatus: "free",
      role: "free",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      throw new Error("User not found");
    }
    
    const updatedUser: User = {
      ...existingUser,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getAllModules(): Promise<LearningModule[]> {
    return Array.from(this.modules.values()).sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async getModule(id: number): Promise<LearningModule | undefined> {
    return this.modules.get(id);
  }

  async checkOrderIndexExists(orderIndex: number, excludeModuleId?: number): Promise<boolean> {
    for (const module of this.modules.values()) {
      if (module.orderIndex === orderIndex && (!excludeModuleId || module.id !== excludeModuleId)) {
        return true;
      }
    }
    return false;
  }

  async createModule(insertModule: InsertLearningModule): Promise<LearningModule> {
    const id = this.currentModuleId++;
    const module: LearningModule = {
      id,
      title: insertModule.title,
      titleEs: insertModule.titleEs ?? null,
      description: insertModule.description,
      descriptionEs: insertModule.descriptionEs ?? null,
      orderIndex: insertModule.orderIndex,
      isPremium: insertModule.isPremium ?? false,
      createdAt: new Date(),
    };
    this.modules.set(id, module);
    return module;
  }

  // Module video operations
  async getModuleVideos(moduleId: number): Promise<ModuleVideo[]> {
    return Array.from(this.moduleVideos.values())
      .filter(v => v.moduleId === moduleId)
      .sort((a, b) => a.videoOrder - b.videoOrder);
  }

  async createModuleVideo(video: InsertModuleVideo): Promise<ModuleVideo> {
    const id = this.currentVideoId++;
    const created: ModuleVideo = {
      id,
      moduleId: video.moduleId,
      videoUrl: video.videoUrl,
      title: video.title,
      titleEs: video.titleEs ?? null,
      description: video.description ?? null,
      descriptionEs: video.descriptionEs ?? null,
      videoOrder: video.videoOrder,
      createdAt: new Date(),
    };
    this.moduleVideos.set(id, created);
    return created;
  }

  async updateModuleVideo(videoId: number, updates: Partial<InsertModuleVideo>): Promise<ModuleVideo> {
    const existing = this.moduleVideos.get(videoId);
    if (!existing) {
      throw new Error("Video not found");
    }
    const updated: ModuleVideo = {
      ...existing,
      ...updates,
    };
    this.moduleVideos.set(videoId, updated);
    return updated;
  }

  async deleteModuleVideo(videoId: number): Promise<void> {
    this.moduleVideos.delete(videoId);
  }

  // User video progress operations
  async getUserVideoProgress(userId: number, videoId: number): Promise<UserVideoProgress | undefined> {
    const key = `${userId}-${videoId}`;
    return this.videoProgress.get(key);
  }

  async updateUserVideoProgress(progress: InsertUserVideoProgress): Promise<UserVideoProgress> {
    const key = `${progress.userId}-${progress.videoId}`;
    const existing = this.videoProgress.get(key);

    const videoProgress: UserVideoProgress = {
      id: existing?.id || this.currentVideoProgressId++,
      userId: progress.userId,
      videoId: progress.videoId,
      watchedSeconds: progress.watchedSeconds ?? 0,
      totalSeconds: progress.totalSeconds ?? null,
      completionPercentage: progress.completionPercentage ?? 0,
      completed: progress.completed ?? false,
      completedAt: progress.completed ? new Date() : existing?.completedAt ?? null,
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    this.videoProgress.set(key, videoProgress);
    return videoProgress;
  }

  async getUserVideoProgressSummary(userId: number): Promise<{
    totalVideosCompleted: number;
    totalVideosWatched: number;
    totalWatchTime: number;
    averageCompletionRate: number;
  }> {
    const userVideos = Array.from(this.videoProgress.values()).filter(
      (vp) => vp.userId === userId
    );

    const totalVideosCompleted = userVideos.filter((vp) => vp.completed).length;
    const totalVideosWatched = userVideos.length;
    const totalWatchTime = userVideos.reduce((sum, vp) => sum + (vp.watchedSeconds || 0), 0);
    const averageCompletionRate = 
      userVideos.length > 0
        ? userVideos.reduce((sum, vp) => sum + (vp.completionPercentage || 0), 0) / userVideos.length
        : 0;

    return {
      totalVideosCompleted,
      totalVideosWatched,
      totalWatchTime,
      averageCompletionRate,
    };
  }

  async getUserProgress(userId: number): Promise<UserProgress[]> {
    return Array.from(this.progress.values()).filter(p => p.userId === userId);
  }

  async getModuleProgress(userId: number, moduleId: number): Promise<UserProgress | undefined> {
    const key = `${userId}-${moduleId}`;
    return this.progress.get(key);
  }

  async updateProgress(insertProgress: InsertUserProgress): Promise<UserProgress> {
    const key = `${insertProgress.userId}-${insertProgress.moduleId}`;
    const existing = this.progress.get(key);
    
    const progress: UserProgress = {
      id: existing?.id || this.currentProgressId++,
      userId: insertProgress.userId,
      moduleId: insertProgress.moduleId,
      completed: insertProgress.completed || false,
      completedAt: insertProgress.completed ? new Date() : existing?.completedAt || null,
      createdAt: existing?.createdAt || new Date(),
    };
    
    this.progress.set(key, progress);
    return progress;
  }

  async getRecentRecaps(limit: number = 3): Promise<MarketRecap[]> {
    return Array.from(this.recaps.values())
      .sort((a, b) => b.publishedAt!.getTime() - a.publishedAt!.getTime())
      .slice(0, limit);
  }

  async createRecap(insertRecap: InsertMarketRecap): Promise<MarketRecap> {
    const id = this.currentRecapId++;
    const recap: MarketRecap = {
      id,
      title: insertRecap.title,
      summary: insertRecap.summary,
      content: insertRecap.content || null,
      publishedAt: new Date(),
      createdAt: new Date(),
    };
    this.recaps.set(id, recap);
    return recap;
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = this.currentNotificationId++;
    const notification: Notification = {
      id,
      message: insertNotification.message,
      type: insertNotification.type,
      title: insertNotification.title,
      userId: insertNotification.userId,
      read: false,
      scheduledFor: insertNotification.scheduledFor || null,
      sentAt: null,
      createdAt: new Date(),
    };
    this.notifications.set(id, notification);
    return notification;
  }

  // Community post operations
  async getAllPosts(): Promise<CommunityPost[]> {
    return Array.from(this.posts.values()).sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async createPost(insertPost: InsertCommunityPost): Promise<CommunityPost> {
    const id = this.currentPostId++;
    const post: CommunityPost = {
      id,
      userId: insertPost.userId,
      content: insertPost.content,
      imageUrl: insertPost.imageUrl ?? null,
      postType: insertPost.postType || "general",
      messageType: insertPost.messageType ?? null,
      ticker: insertPost.ticker ?? null,
      stockSymbol: insertPost.stockSymbol || null,
      stockData: insertPost.stockData || null,
      signalData: insertPost.signalData || null,
      predictionData: insertPost.predictionData ?? null,
      analysisType: insertPost.analysisType ?? null,
      xpReward: insertPost.xpReward ?? 0,
      tags: insertPost.tags || [],
      likesCount: 0,
      commentsCount: 0,
      repostsCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    this.posts.set(id, post);
    return post;
  }

  async getPostById(id: number): Promise<CommunityPost | undefined> {
    return this.posts.get(id);
  }

  async likePost(userId: number, postId: number): Promise<void> {
    const likeKey = `${userId}-${postId}`;
    this.postLikes.set(likeKey, true);
    
    // Update post likes count
    const post = this.posts.get(postId);
    if (post) {
      post.likesCount = (post.likesCount || 0) + 1;
      this.posts.set(postId, post);
    }
  }

  async unlikePost(userId: number, postId: number): Promise<void> {
    const likeKey = `${userId}-${postId}`;
    this.postLikes.delete(likeKey);
    
    // Update post likes count
    const post = this.posts.get(postId);
    if (post) {
      const currentLikes = post.likesCount || 0;
      if (currentLikes > 0) {
        post.likesCount = currentLikes - 1;
        this.posts.set(postId, post);
      }
    }
  }

  async isPostLiked(userId: number, postId: number): Promise<boolean> {
    const likeKey = `${userId}-${postId}`;
    return this.postLikes.has(likeKey);
  }

  async repostPost(userId: number, postId: number): Promise<void> {
    const repostKey = `${userId}-${postId}`;
    this.postReposts.set(repostKey, true);
    
    // Update post reposts count
    const post = this.posts.get(postId);
    if (post) {
      post.repostsCount = (post.repostsCount || 0) + 1;
      this.posts.set(postId, post);
    }
  }

  async unrepostPost(userId: number, postId: number): Promise<void> {
    const repostKey = `${userId}-${postId}`;
    this.postReposts.delete(repostKey);
    
    // Update post reposts count
    const post = this.posts.get(postId);
    if (post && (post.repostsCount || 0) > 0) {
      post.repostsCount = (post.repostsCount || 0) - 1;
      this.posts.set(postId, post);
    }
  }

  async isPostReposted(userId: number, postId: number): Promise<boolean> {
    const repostKey = `${userId}-${postId}`;
    return this.postReposts.has(repostKey);
  }

  async getPostComments(postId: number): Promise<any[]> {
    return this.comments.get(postId) || [];
  }

  async createComment(postId: number, userId: number, content: string): Promise<any> {
    const comment = {
      id: Date.now(),
      userId,
      content,
      createdAt: new Date(),
      user: this.users.get(userId)
    };

    const postComments = this.comments.get(postId) || [];
    postComments.push(comment);
    this.comments.set(postId, postComments);

    // Update post comments count
    const post = this.posts.get(postId);
    if (post) {
      post.commentsCount = (post.commentsCount || 0) + 1;
      this.posts.set(postId, post);
    }

    return comment;
  }

  // Block operations
  private userBlocks: Map<string, boolean> = new Map(); // key: "blockerId-blockedId"

  async blockUser(blockerId: number, blockedId: number): Promise<void> {
    const blockKey = `${blockerId}-${blockedId}`;
    this.userBlocks.set(blockKey, true);
  }

  async unblockUser(blockerId: number, blockedId: number): Promise<void> {
    const blockKey = `${blockerId}-${blockedId}`;
    this.userBlocks.delete(blockKey);
  }

  async isUserBlocked(blockerId: number, blockedId: number): Promise<boolean> {
    const blockKey = `${blockerId}-${blockedId}`;
    return this.userBlocks.has(blockKey);
  }

  async getBlockedUserIds(userId: number): Promise<number[]> {
    const blockedIds: number[] = [];
    const keys = Array.from(this.userBlocks.keys());
    for (const key of keys) {
      const [blockerId, blockedId] = key.split('-').map(Number);
      if (blockerId === userId) {
        blockedIds.push(blockedId);
      }
    }
    return blockedIds;
  }

  // Paginated post operations
  async getPostsPaginated(params: {
    currentUserId: number;
    cursor?: { createdAt: Date; id: number };
    limit: number;
  }): Promise<CommunityPost[]> {
    const { currentUserId, cursor, limit } = params;
    
    // Get blocked user IDs
    const blockedUserIds = await this.getBlockedUserIds(currentUserId);
    
    // Get all posts
    let posts = Array.from(this.posts.values());
    
    // Filter out soft-deleted posts and posts from blocked users
    posts = posts.filter(post => 
      !post.deletedAt && 
      !blockedUserIds.includes(post.userId)
    );
    
    // Sort by createdAt DESC, then by id DESC
    posts.sort((a, b) => {
      const aDate = a.createdAt ? a.createdAt.getTime() : 0;
      const bDate = b.createdAt ? b.createdAt.getTime() : 0;
      const dateCompare = bDate - aDate;
      if (dateCompare !== 0) return dateCompare;
      return b.id - a.id;
    });
    
    // Apply cursor pagination - advance past cursor using strict (createdAt, id) comparison
    if (cursor) {
      posts = posts.filter(post => {
        if (!post.createdAt) return false;
        const postTime = post.createdAt.getTime();
        const cursorTime = cursor.createdAt.getTime();
        
        // Return posts that come after the cursor
        if (postTime < cursorTime) return true;
        if (postTime === cursorTime && post.id < cursor.id) return true;
        return false;
      });
    }
    
    // Return limit + 1 to check if there are more results
    return posts.slice(0, limit + 1);
  }

  // Subscription operations
  async getUserSubscription(userId: number): Promise<Subscription | undefined> {
    return Array.from(this.subscriptions.values()).find(
      subscription => subscription.userId === userId
    );
  }

  async createSubscription(insertSubscription: InsertSubscription): Promise<Subscription> {
    const subscription: Subscription = {
      id: this.currentSubscriptionId++,
      userId: insertSubscription.userId,
      planType: insertSubscription.planType,
      status: insertSubscription.status,
      stripeCustomerId: insertSubscription.stripeCustomerId || null,
      stripeSubscriptionId: insertSubscription.stripeSubscriptionId || null,
      paypalSubscriptionId: insertSubscription.paypalSubscriptionId || null,
      revenueCatSubscriptionId: insertSubscription.revenueCatSubscriptionId || null,
      currentPeriodStart: insertSubscription.currentPeriodStart || null,
      currentPeriodEnd: insertSubscription.currentPeriodEnd || null,
      trialStart: insertSubscription.trialStart || null,
      trialEnd: insertSubscription.trialEnd || null,
      canceledAt: insertSubscription.canceledAt || null,
      founderDiscount: insertSubscription.founderDiscount || false,
      discountPercent: insertSubscription.discountPercent || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.subscriptions.set(subscription.id, subscription);
    return subscription;
  }

  async updateSubscription(id: number, updates: Partial<Subscription>): Promise<Subscription> {
    const existing = this.subscriptions.get(id);
    if (!existing) {
      throw new Error("Subscription not found");
    }

    const updated: Subscription = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    this.subscriptions.set(id, updated);
    return updated;
  }

  // Payment operations
  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const payment: Payment = {
      id: this.currentPaymentId++,
      subscriptionId: insertPayment.subscriptionId,
      stripePaymentIntentId: insertPayment.stripePaymentIntentId ?? null,
      paypalPaymentId: insertPayment.paypalPaymentId ?? null,
      amount: insertPayment.amount,
      currency: insertPayment.currency ?? "USD",
      status: insertPayment.status,
      paymentMethod: insertPayment.paymentMethod,
      paidAt: insertPayment.paidAt ?? null,
      createdAt: new Date(),
    };
    
    this.payments.set(payment.id, payment);
    return payment;
  }

  async getPaymentHistory(subscriptionId: number): Promise<Payment[]> {
    const payments = Array.from(this.payments.values())
      .filter(payment => payment.subscriptionId === subscriptionId)
      .sort((a, b) => {
        const aTime = a.createdAt?.getTime() || 0;
        const bTime = b.createdAt?.getTime() || 0;
        return bTime - aTime;
      });
    return payments;
  }

  // Subscription history
  async addSubscriptionHistory(insertHistory: InsertSubscriptionHistory): Promise<SubscriptionHistory> {
    const history: SubscriptionHistory = {
      id: this.currentHistoryId++,
      subscriptionId: insertHistory.subscriptionId,
      action: insertHistory.action,
      fromPlan: insertHistory.fromPlan ?? null,
      toPlan: insertHistory.toPlan ?? null,
      effectiveDate: insertHistory.effectiveDate,
      notes: insertHistory.notes ?? null,
      createdAt: new Date(),
    };
    
    this.subscriptionHistoryMap.set(history.id, history);
    return history;
  }

  // Password reset operations
  async createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<any> {
    const resetToken = {
      id: this.currentPasswordResetTokenId++,
      userId,
      token,
      expiresAt,
      used: false,
      createdAt: new Date(),
    };
    this.passwordResetTokens.set(token, resetToken);
    return resetToken;
  }

  async getPasswordResetToken(token: string): Promise<any | undefined> {
    const resetToken = this.passwordResetTokens.get(token);
    if (!resetToken || resetToken.used) {
      return undefined;
    }
    
    // Check if token is expired
    if (new Date(resetToken.expiresAt) < new Date()) {
      return undefined;
    }
    
    return resetToken;
  }

  async invalidatePasswordResetToken(token: string): Promise<void> {
    const resetToken = this.passwordResetTokens.get(token);
    if (resetToken) {
      resetToken.used = true;
      this.passwordResetTokens.set(token, resetToken);
    }
  }

  async updateUserPassword(userId: number, newPassword: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    user.password = newPassword;
    user.updatedAt = new Date();
    this.users.set(userId, user);
  }

  // Webhook log operations
  async createWebhookLog(log: any): Promise<any> {
    const webhookLog = {
      id: this.currentWebhookLogId++,
      source: log.source,
      eventId: log.eventId || null,
      eventType: log.eventType,
      payload: log.payload,
      userId: log.userId || null,
      subscriptionId: log.subscriptionId || null,
      status: log.status || "received",
      errorMessage: log.errorMessage || null,
      processedAt: log.processedAt || null,
      createdAt: new Date(),
    };
    this.webhookLogs.set(webhookLog.id, webhookLog);
    return webhookLog;
  }

  async getWebhookLogs(params: {
    limit?: number;
    offset?: number;
    source?: string;
    status?: string;
  }): Promise<any[]> {
    const { limit = 100, offset = 0, source, status } = params;
    
    let logs = Array.from(this.webhookLogs.values());
    
    // Filter by source if provided
    if (source) {
      logs = logs.filter(log => log.source === source);
    }
    
    // Filter by status if provided
    if (status) {
      logs = logs.filter(log => log.status === status);
    }
    
    // Sort by createdAt DESC
    logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    // Apply pagination
    return logs.slice(offset, offset + limit);
  }

  async getWebhookLog(id: number): Promise<any | undefined> {
    return this.webhookLogs.get(id);
  }

  async getWebhookLogByEventId(source: string, eventId: string): Promise<any | undefined> {
    if (!eventId) {
      return undefined;
    }
    const logs = Array.from(this.webhookLogs.values());
    return logs.find(log => log.source === source && log.eventId === eventId);
  }

  async updateWebhookLogStatus(
    id: number,
    status: string,
    errorMessage?: string,
    subscriptionId?: number
  ): Promise<void> {
    const log = this.webhookLogs.get(id);
    if (!log) {
      throw new Error("Webhook log not found");
    }
    
    log.status = status;
    log.errorMessage = errorMessage || null;
    log.processedAt = new Date();
    if (subscriptionId !== undefined) {
      log.subscriptionId = subscriptionId;
    }
    
    this.webhookLogs.set(id, log);
  }
}

// Switch to database-backed storage for persistence
import { dbStorage } from "./dbStorage";
export const storage = dbStorage; // Using DbStorage instead of MemStorage
