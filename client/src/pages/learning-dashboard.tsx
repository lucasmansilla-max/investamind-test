import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ExpandableModuleCard from "@/expandable-module-card";
import BottomNavigation from "@/bottom-navigation";
import PremiumGate from "@/components/upgrade-prompts/PremiumGate";
import { useAuth } from "@/hooks/use-auth";
import { useHasPremiumAccess } from "@/hooks/use-subscription-status";
import { useProgress } from "@/hooks/use-progress";
import { Trophy, Target, Flame, Clock, BookOpen, ChevronLeft, Lock } from "lucide-react";

// Complete curriculum data structure
const modulesData = [
  {
    id: 1,
    title: "Quick Start Guide",
    subtitle: "7-Day Foundation Course",
    icon: "🚀",
    totalLessons: 7,
    completedLessons: 0, // Will be calculated from real user progress
    estimatedTime: "1.5 hours",
    status: "locked" as const, // Will be calculated from real user progress
    description: "Master the fundamentals of investing in just one week",
    lessons: [
      {
        id: 1,
        title: "Day 1: Stock Market Basics",
        duration: "12 minutes",
        status: "locked" as const, // Will be calculated from real user progress
        description: "Understanding what stocks are and how markets work"
      },
      {
        id: 2,
        title: "Day 2: How Trading Works",
        duration: "10 minutes", 
        status: "locked" as const, // Will be calculated from real user progress
        description: "The mechanics of buying and selling stocks"
      },
      {
        id: 3,
        title: "Day 3: Types of Orders",
        duration: "8 minutes",
        status: "locked" as const, // Will be calculated from real user progress
        description: "Market orders, limit orders, and stop-loss explained"
      },
      {
        id: 4,
        title: "Day 4: Risk Management Basics",
        duration: "15 minutes",
        status: "locked" as const, // Will be calculated from real user progress
        description: "Protecting your investments and managing risk"
      },
      {
        id: 5,
        title: "Day 5: Building Your First Portfolio",
        duration: "12 minutes",
        status: "locked" as const,
        description: "Creating a balanced investment portfolio"
      },
      {
        id: 6,
        title: "Day 6: Common Beginner Mistakes",
        duration: "10 minutes",
        status: "locked" as const,
        description: "Avoiding costly investing mistakes"
      },
      {
        id: 7,
        title: "Day 7: Your Investment Plan",
        duration: "18 minutes",
        status: "locked" as const,
        description: "Creating your personal investment strategy"
      }
    ]
  },
  {
    id: 2,
    title: "Stock Fundamentals",
    subtitle: "Understanding Company Analysis",
    icon: "📊",
    totalLessons: 6,
    completedLessons: 0,
    estimatedTime: "2 hours",
    status: "locked" as const,
    description: "Deep dive into analyzing and valuing companies",
    lessons: [
      {
        id: 8,
        title: "Understanding Company Financials",
        duration: "20 minutes",
        status: "locked" as const,
        description: "Reading balance sheets, income statements, and cash flow"
      },
      {
        id: 9,
        title: "Reading Financial Statements",
        duration: "18 minutes",
        status: "locked" as const,
        description: "Key metrics and ratios for stock analysis"
      },
      {
        id: 10,
        title: "Valuation Methods",
        duration: "22 minutes",
        status: "locked" as const,
        description: "P/E ratios, DCF models, and comparative analysis"
      },
      {
        id: 11,
        title: "Dividend Investing",
        duration: "15 minutes",
        status: "locked" as const,
        description: "Building income through dividend-paying stocks"
      },
      {
        id: 12,
        title: "Growth vs Value Stocks",
        duration: "16 minutes",
        status: "locked" as const,
        description: "Understanding different investment styles"
      },
      {
        id: 13,
        title: "Sector Analysis",
        duration: "19 minutes",
        status: "locked" as const,
        description: "Analyzing industries and market sectors"
      }
    ]
  },
  {
    id: 3,
    title: "Technical Analysis",
    subtitle: "Chart Reading & Patterns",
    icon: "📈",
    totalLessons: 8,
    completedLessons: 0,
    estimatedTime: "3 hours",
    status: "locked" as const,
    description: "Master the art of reading charts and technical indicators",
    lessons: [
      {
        id: 14,
        title: "Chart Reading Basics",
        duration: "25 minutes",
        status: "locked" as const,
        description: "Understanding candlesticks, timeframes, and basic patterns"
      },
      {
        id: 15,
        title: "Support and Resistance",
        duration: "20 minutes",
        status: "locked" as const,
        description: "Identifying key price levels and breakouts"
      },
      {
        id: 16,
        title: "Trend Analysis",
        duration: "18 minutes",
        status: "locked" as const,
        description: "Recognizing and trading with market trends"
      },
      {
        id: 17,
        title: "Moving Averages",
        duration: "22 minutes",
        status: "locked" as const,
        description: "Using moving averages for trend confirmation"
      },
      {
        id: 18,
        title: "Volume Analysis",
        duration: "16 minutes",
        status: "locked" as const,
        description: "Understanding volume patterns and confirmation"
      },
      {
        id: 19,
        title: "Chart Patterns",
        duration: "28 minutes",
        status: "locked" as const,
        description: "Head and shoulders, triangles, and reversal patterns"
      },
      {
        id: 20,
        title: "Technical Indicators",
        duration: "24 minutes",
        status: "locked" as const,
        description: "RSI, MACD, Bollinger Bands, and oscillators"
      },
      {
        id: 21,
        title: "Putting It All Together",
        duration: "30 minutes",
        status: "locked" as const,
        description: "Combining technical analysis for trading decisions"
      }
    ]
  },
  {
    id: 4,
    title: "Portfolio Management",
    subtitle: "Building Wealth Systematically",
    icon: "🎯",
    totalLessons: 6,
    completedLessons: 0,
    estimatedTime: "2.5 hours",
    status: "locked" as const,
    description: "Advanced portfolio construction and management strategies",
    lessons: [
      {
        id: 22,
        title: "Asset Allocation",
        duration: "25 minutes",
        status: "locked" as const,
        description: "Balancing stocks, bonds, and alternative investments"
      },
      {
        id: 23,
        title: "Diversification Strategies",
        duration: "20 minutes",
        status: "locked" as const,
        description: "Reducing risk through proper diversification"
      },
      {
        id: 24,
        title: "Rebalancing",
        duration: "18 minutes",
        status: "locked" as const,
        description: "Maintaining your target allocation over time"
      },
      {
        id: 25,
        title: "Tax Considerations",
        duration: "22 minutes",
        status: "locked" as const,
        description: "Tax-efficient investing strategies"
      },
      {
        id: 26,
        title: "Performance Tracking",
        duration: "16 minutes",
        status: "locked" as const,
        description: "Measuring and evaluating portfolio performance"
      },
      {
        id: 27,
        title: "Long-term Planning",
        duration: "24 minutes",
        status: "locked" as const,
        description: "Setting and achieving long-term financial goals"
      }
    ]
  },
  {
    id: 5,
    title: "Advanced Strategies",
    subtitle: "Professional Techniques",
    icon: "⚡",
    totalLessons: 7,
    completedLessons: 0,
    estimatedTime: "3.5 hours",
    status: "locked" as const,
    description: "Advanced investing strategies for experienced investors",
    lessons: [
      {
        id: 28,
        title: "Options Basics",
        duration: "30 minutes",
        status: "locked" as const,
        description: "Introduction to options trading and strategies"
      },
      {
        id: 29,
        title: "ETF Investing",
        duration: "25 minutes",
        status: "locked" as const,
        description: "Exchange-traded funds and passive investing"
      },
      {
        id: 30,
        title: "International Markets",
        duration: "28 minutes",
        status: "locked" as const,
        description: "Investing in global markets and currencies"
      },
      {
        id: 31,
        title: "Alternative Investments",
        duration: "32 minutes",
        status: "locked" as const,
        description: "REITs, commodities, and alternative assets"
      },
      {
        id: 32,
        title: "Market Psychology",
        duration: "26 minutes",
        status: "locked" as const,
        description: "Understanding market emotions and behavioral finance"
      },
      {
        id: 33,
        title: "Economic Indicators",
        duration: "24 minutes",
        status: "locked" as const,
        description: "Using economic data for investment decisions"
      },
      {
        id: 34,
        title: "Building Wealth Over Time",
        duration: "35 minutes",
        status: "locked" as const,
        description: "Long-term wealth building strategies and mindset"
      }
    ]
  }
];

export default function LearningDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Get subscription status and check course access
  const { hasPremiumAccess, subscriptionData } = useHasPremiumAccess();
  
  // Get real user progress from database
  const { progress: userProgress } = useProgress();

  // Calculate module progress based on real user data
  const modulesWithProgress = useMemo(() => {
    return modulesData.map(module => {
      // Find progress for this module
      const moduleProgress = userProgress.find(p => p.moduleId === module.id);
      
      // If module is completed, all lessons are completed
      const isModuleCompleted = moduleProgress?.completed === true;
      
      // Calculate completed lessons based on module completion
      // For now, we only track module-level completion, so:
      // - If module is completed: all lessons are completed
      // - If module has progress but not completed: we can estimate based on quiz passed
      // - If no progress: 0 lessons completed
      let completedLessons = 0;
      let moduleStatus: "completed" | "in-progress" | "locked" = "locked";
      
      if (isModuleCompleted) {
        completedLessons = module.totalLessons;
        moduleStatus = "completed";
      } else if (moduleProgress) {
        // Module has some progress but not completed
        // Estimate: if quiz passed, assume ~80% progress, otherwise ~50%
        completedLessons = moduleProgress.quizPassed 
          ? Math.floor(module.totalLessons * 0.8)
          : Math.floor(module.totalLessons * 0.5);
        moduleStatus = "in-progress";
      } else {
        // No progress - for first module, it's available (not locked)
        // For other modules, depends on access
        if (module.id === 1) {
          moduleStatus = "in-progress"; // First module is always available
        } else {
          moduleStatus = "locked";
        }
      }
      
      // Update lesson statuses based on progress
      const lessons = module.lessons.map((lesson, index) => {
        let lessonStatus: "completed" | "current" | "locked" = "locked";
        
        if (isModuleCompleted) {
          // All lessons completed
          lessonStatus = "completed";
        } else if (moduleProgress) {
          // Module in progress
          if (index < completedLessons) {
            lessonStatus = "completed";
          } else if (index === completedLessons) {
            lessonStatus = "current";
          } else {
            lessonStatus = "locked";
          }
        } else {
          // No progress - first lesson of first module is current, rest are locked
          if (module.id === 1 && index === 0) {
            lessonStatus = "current";
          } else {
            lessonStatus = "locked";
          }
        }
        
        return {
          ...lesson,
          status: lessonStatus
        };
      });
      
      return {
        ...module,
        completedLessons,
        status: moduleStatus,
        lessons
      };
    });
  }, [userProgress]);

  // Filter modules based on user role
  const availableModules = useMemo(() => {
    if (hasPremiumAccess) {
      // Premium/Legacy/Admin users can see all modules
      // The ExpandableModuleCard will handle the "locked" status appropriately for premium users
      return modulesWithProgress;
    } else {
      // Free users can only see the first module
      return modulesWithProgress.filter(module => module.id === 1);
    }
  }, [hasPremiumAccess, modulesWithProgress]);

  // Calculate overall progress (only for available modules)
  const totalLessons = useMemo(() => {
    return availableModules.reduce((acc, module) => acc + module.totalLessons, 0);
  }, [availableModules]);

  const completedLessons = useMemo(() => {
    return availableModules.reduce((acc, module) => acc + module.completedLessons, 0);
  }, [availableModules]);

  const overallProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  // Calculate learning streak (mock data)
  const learningStreak = 5;
  const totalTimeSpent = "12.5 hours";

  const handleLessonClick = (moduleId: number, lessonId: number) => {
    setLocation(`/module/${moduleId}/lesson/${lessonId}`);
  };

  return (
    <div className="page-wrapper" style={{ height: '100vh', maxHeight: '100vh', overflow: 'auto' }}>
      <div className="min-h-screen bg-brand-light-green/10" style={{ marginTop: 0, paddingTop: 0 }}>
        {/* Header */}
        <header className="bg-brand-light-green border-b border-brand-dark-green/20 sticky top-0 z-40" style={{ marginTop: 0 }}>
          <div className="flex items-center justify-between p-4" style={{ marginTop: 0, paddingTop: '16px' }}>
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/")}
                className="text-brand-dark-green hover:text-brand-orange"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-brand-dark-green">Learning Dashboard</h1>
                <p className="text-sm text-brand-dark-green/70">Your path to investment mastery</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className="bg-brand-orange/10 text-brand-orange border-brand-orange/20">
                <Flame className="w-3 h-3 mr-1" />
                {learningStreak} day streak
              </Badge>
            </div>
        </div>
      </header>

      <div className="pb-20">
        {/* Progress Overview */}
        <div className="p-4">
          <div className="bg-gradient-to-r from-brand-dark-green to-brand-orange rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold mb-2">Your Learning Journey</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{Math.round(overallProgress)}%</div>
                <div className="text-sm opacity-90">Complete</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{completedLessons}</div>
                <div className="text-sm opacity-90">Lessons Done</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{learningStreak}</div>
                <div className="text-sm opacity-90">Day Streak</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="px-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-brand-light-green">
              <CardContent className="p-4 text-center">
                <Trophy className="w-8 h-8 text-brand-orange mx-auto mb-2" />
                <div className="text-lg font-bold text-brand-dark-green">{completedLessons}</div>
                <div className="text-sm text-brand-dark-green/70">Lessons Completed</div>
              </CardContent>
            </Card>
            <Card className="border-brand-light-green">
              <CardContent className="p-4 text-center">
                <Clock className="w-8 h-8 text-brand-orange mx-auto mb-2" />
                <div className="text-lg font-bold text-brand-dark-green">{totalTimeSpent}</div>
                <div className="text-sm text-brand-dark-green/70">Time Invested</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Learning Modules */}
        <div className="px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-brand-dark-green flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-brand-orange" />
              Learning Modules
            </h2>
            <Badge variant="outline" className="text-brand-dark-green border-brand-dark-green/30">
              {availableModules.length} {availableModules.length === 1 ? 'module' : 'modules'}
              {!hasPremiumAccess && ` (${modulesData.length - 1} locked)`}
            </Badge>
          </div>

          {/* Modules List */}
          <div className="space-y-4">
            {availableModules.map((module) => (
              <ExpandableModuleCard
                key={module.id}
                module={module}
                onLessonClick={handleLessonClick}
                subscriptionData={subscriptionData}
              />
            ))}

            {/* Premium Gate for locked modules (Free users) */}
            {!hasPremiumAccess && modulesWithProgress.length > 1 && (
              <PremiumGate
                contentType="course"
                title="Unlock All Learning Modules"
                description={`Upgrade to Premium to access all ${modulesWithProgress.length - 1} advanced modules and unlock your full investment education journey`}
              >
                <div className="space-y-4">
                  {modulesWithProgress
                    .filter(module => module.id !== 1)
                    .map((module) => (
                      <ExpandableModuleCard
                        key={module.id}
                        module={module}
                        onLessonClick={handleLessonClick}
                        subscriptionData={subscriptionData}
                      />
                    ))}
                </div>
              </PremiumGate>
            )}
          </div>

          {/* Motivation Section */}
          <div className="mt-8 mb-6">
            {hasPremiumAccess ? (
              <Card className="bg-gradient-to-r from-brand-dark-green to-brand-orange text-white">
                <CardContent className="p-6 text-center">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-90" />
                  <h3 className="text-xl font-bold mb-2">Keep Going!</h3>
                  <p className="opacity-90 mb-4">
                    You're {Math.round(overallProgress)}% through your investment education journey. 
                    Every lesson brings you closer to financial mastery.
                  </p>
                  <Button 
                    className="bg-white text-brand-dark-green hover:bg-brand-light-green font-semibold"
                    onClick={() => {
                      // Find next available lesson
                      const currentModule = availableModules.find(m => m.status === "in-progress");
                      if (currentModule) {
                        const nextLesson = currentModule.lessons.find(l => l.status === "current");
                        if (nextLesson) {
                          handleLessonClick(currentModule.id, nextLesson.id);
                        }
                      }
                    }}
                  >
                    Continue Learning
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gradient-to-r from-brand-dark-green to-brand-orange text-white">
                <CardContent className="p-6 text-center">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-90" />
                  <h3 className="text-xl font-bold mb-2">Unlock Your Full Potential!</h3>
                  <p className="opacity-90 mb-4">
                    You've completed {Math.round(overallProgress)}% of the free module. 
                    Upgrade to Premium to access all {modulesWithProgress.length} modules and unlock your complete investment education.
                  </p>
                  <Button 
                    className="bg-white text-brand-dark-green hover:bg-brand-light-green font-semibold"
                    onClick={() => setLocation("/pricing")}
                  >
                    Upgrade to Premium
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <BottomNavigation />
      </div>
    </div>
  );
}