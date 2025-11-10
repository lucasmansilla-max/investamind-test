import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedAt?: Date;
  progress: number;
  maxProgress: number;
  category: 'learning' | 'streak' | 'completion' | 'engagement';
}

interface UserStats {
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  lessonsCompleted: number;
  modulesCompleted: number;
  totalTimeSpent: number; // in minutes
  level: number;
  experiencePoints: number;
  nextLevelXP: number;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_lesson',
    title: 'First Steps',
    description: 'Complete your first lesson',
    icon: '🎯',
    progress: 0,
    maxProgress: 1,
    category: 'learning'
  },
  {
    id: 'week_streak',
    title: 'Week Warrior',
    description: 'Maintain a 7-day learning streak',
    icon: '🔥',
    progress: 0,
    maxProgress: 7,
    category: 'streak'
  },
  {
    id: 'first_module',
    title: 'Module Master',
    description: 'Complete your first module',
    icon: '📚',
    progress: 0,
    maxProgress: 1,
    category: 'completion'
  },
  {
    id: 'quiz_master',
    title: 'Quiz Champion',
    description: 'Get 10 quiz questions correct in a row',
    icon: '🧠',
    progress: 0,
    maxProgress: 10,
    category: 'learning'
  },
  {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Complete a lesson before 9 AM',
    icon: '🌅',
    progress: 0,
    maxProgress: 1,
    category: 'engagement'
  },
  {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Complete a lesson after 9 PM',
    icon: '🦉',
    progress: 0,
    maxProgress: 1,
    category: 'engagement'
  },
  {
    id: 'month_streak',
    title: 'Consistency King',
    description: 'Maintain a 30-day learning streak',
    icon: '👑',
    progress: 0,
    maxProgress: 30,
    category: 'streak'
  },
  {
    id: 'all_modules',
    title: 'Investment Expert',
    description: 'Complete all learning modules',
    icon: '🏆',
    progress: 0,
    maxProgress: 5,
    category: 'completion'
  }
];

const DAILY_QUOTES = [
  {
    quote: "The stock market is filled with individuals who know the price of everything, but the value of nothing.",
    author: "Philip Fisher"
  },
  {
    quote: "Time in the market beats timing the market.",
    author: "Ken Fisher"
  },
  {
    quote: "Risk comes from not knowing what you're doing.",
    author: "Warren Buffett"
  },
  {
    quote: "The best investment you can make is in yourself.",
    author: "Warren Buffett"
  },
  {
    quote: "Don't put all your eggs in one basket.",
    author: "Traditional Wisdom"
  },
  {
    quote: "Compound interest is the eighth wonder of the world.",
    author: "Albert Einstein"
  },
  {
    quote: "Price is what you pay. Value is what you get.",
    author: "Warren Buffett"
  }
];

export function useGamification() {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState<UserStats>({
    totalPoints: 0,
    currentStreak: 0,
    longestStreak: 0,
    lessonsCompleted: 0,
    modulesCompleted: 0,
    totalTimeSpent: 0,
    level: 1,
    experiencePoints: 0,
    nextLevelXP: 100
  });
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS);
  const [dailyQuote, setDailyQuote] = useState(DAILY_QUOTES[0]);

  // Load user data from localStorage
  useEffect(() => {
    if (user) {
      const savedStats = localStorage.getItem(`gamification_${user.id}`);
      const savedAchievements = localStorage.getItem(`achievements_${user.id}`);
      
      if (savedStats) {
        setUserStats(JSON.parse(savedStats));
      }
      
      if (savedAchievements) {
        setAchievements(JSON.parse(savedAchievements));
      }
    }
  }, [user]);

  // Set daily quote based on date
  useEffect(() => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    const quoteIndex = dayOfYear % DAILY_QUOTES.length;
    setDailyQuote(DAILY_QUOTES[quoteIndex]);
  }, []);

  // Save data to localStorage
  const saveData = (newStats: UserStats, newAchievements: Achievement[]) => {
    if (user) {
      localStorage.setItem(`gamification_${user.id}`, JSON.stringify(newStats));
      localStorage.setItem(`achievements_${user.id}`, JSON.stringify(newAchievements));
    }
  };

  // Award points and update stats
  const awardPoints = (points: number, activity: string) => {
    const newStats = {
      ...userStats,
      totalPoints: userStats.totalPoints + points,
      experiencePoints: userStats.experiencePoints + points
    };

    // Check for level up
    if (newStats.experiencePoints >= newStats.nextLevelXP) {
      newStats.level += 1;
      newStats.experiencePoints = newStats.experiencePoints - newStats.nextLevelXP;
      newStats.nextLevelXP = Math.floor(newStats.nextLevelXP * 1.5); // Increase XP needed for next level
    }

    setUserStats(newStats);
    saveData(newStats, achievements);
    
    return newStats;
  };

  // Complete a lesson
  const completeLesson = (timeSpent: number = 10) => {
    const newStats = {
      ...userStats,
      lessonsCompleted: userStats.lessonsCompleted + 1,
      totalTimeSpent: userStats.totalTimeSpent + timeSpent
    };
    
    // Update current streak
    const lastActivity = localStorage.getItem(`lastActivity_${user?.id}`);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    if (lastActivity === yesterday) {
      newStats.currentStreak += 1;
    } else if (lastActivity !== today) {
      newStats.currentStreak = 1;
    }
    
    if (newStats.currentStreak > newStats.longestStreak) {
      newStats.longestStreak = newStats.currentStreak;
    }
    
    localStorage.setItem(`lastActivity_${user?.id}`, today);
    
    setUserStats(newStats);
    awardPoints(50, 'lesson_completed');
    
    // Check achievements
    checkAchievements(newStats);
  };

  // Complete a module
  const completeModule = () => {
    const newStats = {
      ...userStats,
      modulesCompleted: userStats.modulesCompleted + 1
    };
    
    setUserStats(newStats);
    awardPoints(200, 'module_completed');
    checkAchievements(newStats);
  };

  // Check and unlock achievements
  const checkAchievements = (stats: UserStats) => {
    const updatedAchievements = achievements.map(achievement => {
      if (achievement.earnedAt) return achievement; // Already earned
      
      let newProgress = achievement.progress;
      
      switch (achievement.id) {
        case 'first_lesson':
          newProgress = Math.min(stats.lessonsCompleted, 1);
          break;
        case 'week_streak':
          newProgress = Math.min(stats.currentStreak, 7);
          break;
        case 'first_module':
          newProgress = Math.min(stats.modulesCompleted, 1);
          break;
        case 'month_streak':
          newProgress = Math.min(stats.currentStreak, 30);
          break;
        case 'all_modules':
          newProgress = Math.min(stats.modulesCompleted, 5);
          break;
        case 'early_bird':
        case 'night_owl':
          // These would be checked when lessons are completed with time context
          break;
      }
      
      const updatedAchievement = { ...achievement, progress: newProgress };
      
      // Check if achievement is completed
      if (newProgress >= achievement.maxProgress && !achievement.earnedAt) {
        updatedAchievement.earnedAt = new Date();
        awardPoints(100, `achievement_${achievement.id}`);
      }
      
      return updatedAchievement;
    });
    
    setAchievements(updatedAchievements);
    saveData(stats, updatedAchievements);
  };

  // Get user level info
  const getLevelInfo = () => {
    const levelNames = [
      'Novice Investor',
      'Learning Trader', 
      'Market Student',
      'Investment Apprentice',
      'Trading Enthusiast',
      'Market Analyst',
      'Investment Strategist',
      'Trading Expert',
      'Market Master',
      'Investment Guru'
    ];
    
    const levelIndex = Math.min(userStats.level - 1, levelNames.length - 1);
    return {
      name: levelNames[levelIndex],
      current: userStats.level,
      progressToNext: (userStats.experiencePoints / userStats.nextLevelXP) * 100
    };
  };

  // Get recent achievements (last 3)
  const getRecentAchievements = () => {
    return achievements
      .filter(a => a.earnedAt)
      .sort((a, b) => new Date(b.earnedAt!).getTime() - new Date(a.earnedAt!).getTime())
      .slice(0, 3);
  };

  return {
    userStats,
    achievements,
    dailyQuote,
    completeLesson,
    completeModule,
    awardPoints,
    getLevelInfo,
    getRecentAchievements,
    earnedAchievements: achievements.filter(a => a.earnedAt),
    availableAchievements: achievements.filter(a => !a.earnedAt)
  };
}