import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ExpandableModuleCard from "@/expandable-module-card";
import BottomNavigation from "@/bottom-navigation";
import { useAuth } from "@/hooks/use-auth";
import { Trophy, Target, Flame, Clock, BookOpen, ChevronLeft } from "lucide-react";

// Complete curriculum data structure
const modulesData = [
  {
    id: 1,
    title: "Quick Start Guide",
    subtitle: "7-Day Foundation Course",
    icon: "🚀",
    totalLessons: 7,
    completedLessons: 3,
    estimatedTime: "1.5 hours",
    status: "in-progress" as const,
    description: "Master the fundamentals of investing in just one week",
    lessons: [
      {
        id: 1,
        title: "Day 1: Stock Market Basics",
        duration: "12 minutes",
        status: "completed" as const,
        description: "Understanding what stocks are and how markets work"
      },
      {
        id: 2,
        title: "Day 2: How Trading Works",
        duration: "10 minutes", 
        status: "completed" as const,
        description: "The mechanics of buying and selling stocks"
      },
      {
        id: 3,
        title: "Day 3: Types of Orders",
        duration: "8 minutes",
        status: "completed" as const,
        description: "Market orders, limit orders, and stop-loss explained"
      },
      {
        id: 4,
        title: "Day 4: Risk Management Basics",
        duration: "15 minutes",
        status: "current" as const,
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

  // Calculate overall progress
  const totalLessons = modulesData.reduce((acc, module) => acc + module.totalLessons, 0);
  const completedLessons = modulesData.reduce((acc, module) => acc + module.completedLessons, 0);
  const overallProgress = (completedLessons / totalLessons) * 100;

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
          <div className="bg-gradient-to-r from-brand-dark-green to-brand-orange rounded-2xl p-6 text-white mb-6">
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
              {modulesData.length} modules
            </Badge>
          </div>

          {/* Modules List */}
          <div className="space-y-4">
            {modulesData.map((module) => (
              <ExpandableModuleCard
                key={module.id}
                module={module}
                onLessonClick={handleLessonClick}
              />
            ))}
          </div>

          {/* Motivation Section */}
          <div className="mt-8 mb-6">
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
                    const currentModule = modulesData.find(m => m.status === "in-progress");
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
          </div>
        </div>
      </div>

      <BottomNavigation />
      </div>
    </div>
  );
}