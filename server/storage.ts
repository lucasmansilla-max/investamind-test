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
  
  // User progress operations
  getUserProgress(userId: number): Promise<UserProgress[]>;
  getModuleProgress(userId: number, moduleId: number): Promise<UserProgress | undefined>;
  updateProgress(progress: InsertUserProgress): Promise<UserProgress>;
  
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private modules: Map<number, LearningModule>;
  private progress: Map<string, UserProgress>;
  private recaps: Map<number, MarketRecap>;
  private notifications: Map<number, Notification>;
  private posts: Map<number, CommunityPost>;
  private postLikes: Map<string, boolean>; // key: "userId-postId"
  private postReposts: Map<string, boolean>; // key: "userId-postId"
  private comments: Map<number, any[]>; // key: postId, value: comments array
  private subscriptions: Map<number, Subscription>;
  private payments: Map<number, Payment>;
  private subscriptionHistoryMap: Map<number, SubscriptionHistory>;
  private currentUserId: number;
  private currentModuleId: number;
  private currentProgressId: number;
  private currentRecapId: number;
  private currentNotificationId: number;
  private currentPostId: number;
  private currentSubscriptionId: number;
  private currentPaymentId: number;
  private currentHistoryId: number;

  constructor() {
    this.users = new Map();
    this.modules = new Map();
    this.progress = new Map();
    this.recaps = new Map();
    this.notifications = new Map();
    this.posts = new Map();
    this.postLikes = new Map();
    this.postReposts = new Map();
    this.comments = new Map();
    this.subscriptions = new Map();
    this.payments = new Map();
    this.subscriptionHistoryMap = new Map();
    this.currentUserId = 1;
    this.currentModuleId = 1;
    this.currentProgressId = 1;
    this.currentRecapId = 1;
    this.currentNotificationId = 1;
    this.currentPostId = 1;
    this.currentSubscriptionId = 1;
    this.currentPaymentId = 1;
    this.currentHistoryId = 1;
    
    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Create learning modules for different experience levels
    const moduleData = [
      // PRINCIPIANTE - Quick Start: 7-Day Foundation
      {
        title: "Stock Market Basics",
        description: "Día 1: Fundamentos del mercado",
        content: "El mercado de valores es donde se compran y venden acciones de empresas. Las acciones representan una parte de propiedad en una empresa.",
        experienceLevel: "principiante",
        category: "quick-start",
        orderIndex: 1,
        estimatedMinutes: 15,
        isLocked: false,
        quizQuestion: "¿Qué representa una acción?",
        quizOptions: ["Una deuda de la empresa", "Una parte de propiedad", "Un préstamo", "Un seguro"],
        correctAnswer: "Una parte de propiedad"
      },
      {
        title: "How Trading Works",
        description: "Día 2: Cómo funciona el trading",
        content: "El trading implica comprar barato y vender caro. Se puede hacer en línea através de brokers que conectan con el mercado.",
        experienceLevel: "principiante",
        category: "quick-start",
        orderIndex: 2,
        estimatedMinutes: 12,
        isLocked: false,
        quizQuestion: "¿Cuál es el objetivo básico del trading?",
        quizOptions: ["Comprar caro y vender barato", "Comprar barato y vender caro", "Solo comprar", "Solo vender"],
        correctAnswer: "Comprar barato y vender caro"
      },
      {
        title: "Types of Orders",
        description: "Día 3: Tipos de órdenes de compra/venta",
        content: "Existen diferentes tipos de órdenes: Market (inmediata), Limit (precio específico), Stop-Loss (protección), y Stop-Limit (combinación).",
        experienceLevel: "principiante",
        category: "quick-start",
        orderIndex: 3,
        estimatedMinutes: 10,
        isLocked: false,
        quizQuestion: "¿Qué tipo de orden se ejecuta inmediatamente?",
        quizOptions: ["Limit Order", "Market Order", "Stop-Loss", "Pending Order"],
        correctAnswer: "Market Order"
      },
      {
        title: "Reading Charts",
        description: "Día 4: Interpretación de gráficos básicos",
        content: "Los gráficos muestran el movimiento de precios. Aprende a leer velas, identificar tendencias alcistas y bajistas, y usar indicadores simples.",
        experienceLevel: "principiante",
        category: "quick-start",
        orderIndex: 4,
        estimatedMinutes: 15,
        isLocked: false,
        quizQuestion: "¿Qué indica una tendencia alcista?",
        quizOptions: ["Precios bajando", "Precios subiendo", "Precios estables", "Alta volatilidad"],
        correctAnswer: "Precios subiendo"
      },
      {
        title: "Risk Management",
        description: "Día 5: Gestión de riesgos fundamentales",
        content: "Nunca inviertas más de lo que puedes permitirte perder. Diversifica tu cartera y usa stop-loss para limitar pérdidas.",
        experienceLevel: "principiante",
        category: "quick-start",
        orderIndex: 5,
        estimatedMinutes: 12,
        isLocked: false,
        quizQuestion: "¿Cuál es la regla de oro en inversiones?",
        quizOptions: ["Invertir todo el dinero", "Solo seguir tendencias", "No invertir más de lo que puedes perder", "Siempre comprar barato"],
        correctAnswer: "No invertir más de lo que puedes perder"
      },
      {
        title: "Choosing a Broker",
        description: "Día 6: Selección de broker",
        content: "Factores importantes: comisiones, plataforma fácil de usar, regulación, atención al cliente, y instrumentos disponibles.",
        experienceLevel: "principiante",
        category: "quick-start",
        orderIndex: 6,
        estimatedMinutes: 10,
        isLocked: false,
        quizQuestion: "¿Qué es lo más importante al elegir un broker?",
        quizOptions: ["Solo las comisiones bajas", "Regulación y seguridad", "Muchos instrumentos", "Publicidad atractiva"],
        correctAnswer: "Regulación y seguridad"
      },
      {
        title: "First Strategy",
        description: "Día 7: Tu primera estrategia simple",
        content: "Estrategia básica: comprar en soporte, vender en resistencia. Usa stop-loss del 2-3% y toma ganancias del 5-8%.",
        experienceLevel: "principiante",
        category: "quick-start",
        orderIndex: 7,
        estimatedMinutes: 15,
        isLocked: false,
        quizQuestion: "¿Qué porcentaje es recomendable para stop-loss inicial?",
        quizOptions: ["10-15%", "2-3%", "20-25%", "1%"],
        correctAnswer: "2-3%"
      },
      // INTERMEDIO - Quick Start: 3-Day Strategy Enhancement
      {
        title: "Technical Analysis",
        description: "Día 1: Análisis técnico avanzado",
        content: "Aprende indicadores como RSI, MACD, Bandas de Bollinger y patrones de velas japonesas para timing de entrada y salida.",
        experienceLevel: "intermedio",
        category: "quick-start",
        orderIndex: 1,
        estimatedMinutes: 20,
        isLocked: false,
        quizQuestion: "¿Qué indica un RSI por encima de 70?",
        quizOptions: ["Sobreventa", "Sobrecompra", "Tendencia lateral", "Volatilidad alta"],
        correctAnswer: "Sobrecompra"
      },
      {
        title: "Market Sectors",
        description: "Día 2: Sectores del mercado",
        content: "Tecnología, salud, financiero, energía, consumo. Cada sector tiene características y ciclos específicos.",
        experienceLevel: "intermedio",
        category: "quick-start",
        orderIndex: 2,
        estimatedMinutes: 15,
        isLocked: false,
        quizQuestion: "¿Qué sector suele ser defensivo en recesiones?",
        quizOptions: ["Tecnología", "Salud", "Construcción", "Lujo"],
        correctAnswer: "Salud"
      },
      {
        title: "Portfolio Optimization",
        description: "Día 3: Optimización de cartera",
        content: "Balanceo de activos, rebalanceo periódico, correlaciones entre assets y gestión de riesgo por sector.",
        experienceLevel: "intermedio",
        category: "quick-start",
        orderIndex: 3,
        estimatedMinutes: 18,
        isLocked: false,
        quizQuestion: "¿Con qué frecuencia se recomienda rebalancear?",
        quizOptions: ["Diariamente", "Semanalmente", "Mensual/Trimestral", "Anualmente"],
        correctAnswer: "Mensual/Trimestral"
      },
      {
        title: "Risk Management",
        description: "Protecting your investments",
        content: "Risk management involves diversification, position sizing, and understanding your risk tolerance. Never invest more than you can afford to lose.",
        orderIndex: 4,
        isLocked: true,
        quizQuestion: "What is the primary benefit of diversification?",
        quizOptions: ["Higher returns", "Reducing overall risk", "Lower fees", "Better timing"],
        correctAnswer: "Reducing overall risk"
      },
      {
        title: "Portfolio Building",
        description: "Diversification strategies",
        content: "A well-balanced portfolio includes different asset classes, sectors, and geographic regions to optimize risk-adjusted returns.",
        orderIndex: 5,
        isLocked: true,
        quizQuestion: "What percentage of a portfolio should typically be in stocks for a young investor?",
        quizOptions: ["20-30%", "40-50%", "60-80%", "90-100%"],
        correctAnswer: "60-80%"
      },
      {
        title: "Technical Analysis",
        description: "Chart reading basics",
        content: "Technical analysis uses price charts and trading volume to predict future price movements and identify trading opportunities.",
        orderIndex: 6,
        isLocked: true,
        quizQuestion: "What is a moving average used for?",
        quizOptions: ["Calculating taxes", "Smoothing price data", "Setting stop losses", "Determining company value"],
        correctAnswer: "Smoothing price data"
      },
      {
        title: "Market Psychology",
        description: "Emotional trading pitfalls",
        content: "Understanding market psychology helps avoid common behavioral biases like fear, greed, and herd mentality that can lead to poor investment decisions.",
        orderIndex: 7,
        isLocked: true,
        quizQuestion: "What is the biggest enemy of successful investing?",
        quizOptions: ["High fees", "Market volatility", "Emotional decisions", "Lack of information"],
        correctAnswer: "Emotional decisions"
      },
      {
        title: "Advanced Strategies",
        description: "Professional techniques",
        content: "Advanced strategies include options trading, margin investing, short selling, and alternative investments like REITs and commodities.",
        orderIndex: 8,
        isLocked: true,
        quizQuestion: "What is an option in investing?",
        quizOptions: ["A type of stock", "A contract to buy/sell at a specific price", "A savings account", "A type of bond"],
        correctAnswer: "A contract to buy/sell at a specific price"
      }
    ];

    moduleData.forEach(data => {
      const module: LearningModule = {
        id: this.currentModuleId++,
        experienceLevel: data.experienceLevel || "principiante",
        category: data.category || "quick-start",
        estimatedMinutes: data.estimatedMinutes || 15,
        isLocked: data.isLocked || false,
        quizQuestion: data.quizQuestion || null,
        quizOptions: data.quizOptions || null,
        correctAnswer: data.correctAnswer || null,
        title: data.title,
        description: data.description,
        content: data.content,
        orderIndex: data.orderIndex,
        createdAt: new Date(),
      };
      this.modules.set(module.id, module);
    });

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

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      id,
      email: insertUser.email,
      password: insertUser.password,
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null,
      selectedLanguage: insertUser.selectedLanguage || null,
      experienceLevel: insertUser.experienceLevel || null,
      investmentStyle: insertUser.investmentStyle || null,
      learningStreak: 0,
      totalLessonsCompleted: 0,
      currentModule: null,
      onboardingCompleted: insertUser.onboardingCompleted || false,
      createdAt: new Date(),
      updatedAt: new Date(),
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

  async createModule(insertModule: InsertLearningModule): Promise<LearningModule> {
    const id = this.currentModuleId++;
    const module: LearningModule = {
      ...insertModule,
      id,
      createdAt: new Date(),
    };
    this.modules.set(id, module);
    return module;
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
      completed: insertProgress.completed || null,
      quizPassed: insertProgress.quizPassed || null,
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
      postType: insertPost.postType || "general",
      stockSymbol: insertPost.stockSymbol || null,
      stockData: insertPost.stockData || null,
      signalData: insertPost.signalData || null,
      tags: insertPost.tags || [],
      likesCount: 0,
      commentsCount: 0,
      repostsCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
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
    if (post && post.likesCount > 0) {
      post.likesCount = post.likesCount - 1;
      this.posts.set(postId, post);
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
    for (const subscription of this.subscriptions.values()) {
      if (subscription.userId === userId) {
        return subscription;
      }
    }
    return undefined;
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
      ...insertPayment,
      createdAt: new Date(),
    };
    
    this.payments.set(payment.id, payment);
    return payment;
  }

  async getPaymentHistory(subscriptionId: number): Promise<Payment[]> {
    const payments: Payment[] = [];
    for (const payment of this.payments.values()) {
      if (payment.subscriptionId === subscriptionId) {
        payments.push(payment);
      }
    }
    return payments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Subscription history
  async addSubscriptionHistory(insertHistory: InsertSubscriptionHistory): Promise<SubscriptionHistory> {
    const history: SubscriptionHistory = {
      id: this.currentHistoryId++,
      ...insertHistory,
      createdAt: new Date(),
    };
    
    this.subscriptionHistoryMap.set(history.id, history);
    return history;
  }
}

// Switch to database-backed storage for persistence
import { dbStorage } from "./dbStorage";
export const storage = dbStorage; // Using DbStorage instead of MemStorage
