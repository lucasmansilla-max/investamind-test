import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BottomNavigation from "@/bottom-navigation";
import ProgressBar from "@/progress-bar";
import ExperienceLevelModal from "@/experience-level-modal";
import InvestmentStyleModal from "@/investment-style-modal";
import DailyTradingTip from "@/DailyTradingTip";
import { useProgress } from "@/hooks/use-progress";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/contexts/language-context";
import { useMarketData } from "@/hooks/use-market-data";
import { useGamification } from "@/hooks/use-gamification";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { LearningModule, MarketRecap } from "@shared/schema";
import { useState, useEffect } from "react";
import { Clock, Trophy, Flame, BookOpen, ChevronRight, TrendingUp, TrendingDown, Bell, User, BarChart3, Target } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { completedModules, totalModules, progressPercentage } = useProgress();
  const { marketData, marketNews, marketIndices, marketSentiment } = useMarketData();
  const { userStats, dailyQuote, getLevelInfo } = useGamification();
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [showInvestmentStyleModal, setShowInvestmentStyleModal] = useState(false);

  // Onboarding flow states
  const needsExperienceLevel = user && !user.experienceLevel;
  const needsInvestmentStyle = user && user.experienceLevel && !user.investmentStyle;
  const needsOnboardingCompletion = user && user.experienceLevel && user.investmentStyle && !user.onboardingCompleted;

  // Show modals based on onboarding state
  useEffect(() => {
    if (needsExperienceLevel) {
      setShowExperienceModal(true);
    } else if (needsInvestmentStyle) {
      setShowInvestmentStyleModal(true);
    }
  }, [needsExperienceLevel, needsInvestmentStyle]);

  const levelInfo = getLevelInfo();

  const updateExperienceMutation = useMutation({
    mutationFn: async (level: string) => {
      const response = await fetch(`/api/auth/update-experience`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ experienceLevel: level }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update experience level");
      }
      
      return response.json();
    },
    onSuccess: () => {
      setShowExperienceModal(false);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const updateInvestmentStyleMutation = useMutation({
    mutationFn: async (style: string) => {
      const response = await fetch(`/api/auth/update-investment-style`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ investmentStyle: style }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update investment style");
      }
      
      return response.json();
    },
    onSuccess: () => {
      setShowInvestmentStyleModal(false);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const { data: modules = [] } = useQuery<LearningModule[]>({
    queryKey: ["/api/modules"],
  });

  const { data: marketRecaps = [] } = useQuery<MarketRecap[]>({
    queryKey: ["/api/market-recaps"],
  });

  const availableModules = modules.filter(module => !module.isLocked || completedModules >= module.orderIndex - 1);
  const nextModule = availableModules.find(module => {
    // Find first module not completed
    return true; // For demo, assume we can access first few modules
  });

  return (
    <div className="page-wrapper" style={{ height: '100vh', maxHeight: '100vh', overflow: 'auto' }}>
      <div className="min-h-screen bg-brand-light-green/10">
        {/* Header */}
        <header className="bg-brand-light-green text-brand-dark-green p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <BarChart3 className="w-6 h-6 text-brand-orange" />
          <h1 className="text-xl font-bold">{t('dashboard.title')}</h1>
        </div>
        <div className="flex items-center space-x-4">
          {/* Streak Badge */}
          {userStats.currentStreak > 0 && (
            <Badge className="bg-orange-100 text-orange-800 border-orange-200 flex items-center space-x-1">
              <Flame className="w-3 h-3" />
              <span className="text-xs font-bold">{userStats.currentStreak} {t('dashboard.dayStreak')}</span>
            </Badge>
          )}
          
          {/* Notifications */}
          <button className="relative touch-target transition-all duration-300 hover:scale-110">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 bg-brand-orange text-xs rounded-full w-4 h-4 flex items-center justify-center text-white font-bold">2</span>
          </button>

          {/* User Profile */}
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110">
            <User className="w-4 h-4 text-brand-dark-green" />
          </div>
        </div>
      </header>

      <div className="pb-20">
        {/* User Stats Overview */}
        <div className="p-4">
          <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl p-6 mb-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">{t('dashboard.learningJourney')}</h2>
                <p className="opacity-90">{levelInfo.name}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{userStats.totalPoints}</div>
                <div className="text-sm opacity-90">points</div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div>
                <div className="text-2xl font-bold">{Math.round(progressPercentage)}%</div>
                <div className="text-sm opacity-90">{t('dashboard.percentComplete')}</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{userStats.lessonsCompleted}</div>
                <div className="text-sm opacity-90">{t('dashboard.lessonsDone')}</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{userStats.currentStreak}</div>
                <div className="text-sm opacity-90">{t('dashboard.dayStreak')}</div>
              </div>
            </div>
            
            <ProgressBar progress={progressPercentage} className="mb-2" variant="white" />
            <p className="text-sm opacity-90">{completedModules} {t('dashboard.modulesCompleted')} - {t('dashboard.keepItUp')}</p>
          </div>
        </div>

        {/* Daily Quote */}
        <div className="px-4 mb-6">
          <Card className="bg-gradient-to-r from-brand-dark-green to-brand-light-green text-white">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">💡</div>
                <div className="flex-1">
                  <p className="italic mb-2">"{dailyQuote.quote}"</p>
                  <p className="text-sm opacity-90">— {dailyQuote.author}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Trading Tip */}
        <div className="px-4 mb-6 daily-tip-card">
          <DailyTradingTip />
        </div>

        {/* Quick Actions Grid */}
        <div className="px-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <Button 
              onClick={() => setLocation("/learning")}
              className="bg-brand-orange hover:bg-brand-orange/80 text-white p-4 rounded-xl text-center h-auto flex-col space-y-2"
            >
              <BookOpen className="w-6 h-6" />
              <span className="font-semibold">{t('dashboard.continuelearning')}</span>
            </Button>
            <Button 
              onClick={() => setLocation("/progress")}
              className="bg-brand-blue hover:bg-brand-blue/80 text-white p-4 rounded-xl text-center h-auto flex-col space-y-2"
            >
              <BarChart3 className="w-6 h-6" />
              <span className="font-semibold">{t('dashboard.viewProgress')}</span>
            </Button>
            <Button 
              onClick={() => setLocation("/market")}
              className="bg-brand-light-green hover:bg-brand-light-green/80 text-white p-4 rounded-xl text-center h-auto flex-col space-y-2"
            >
              <TrendingUp className="w-6 h-6" />
              <span className="font-semibold">Market News</span>
            </Button>
            <Button 
              onClick={() => setLocation("/pricing")}
              className="bg-brand-dark-green hover:bg-brand-dark-green/80 text-white p-4 rounded-xl text-center h-auto flex-col space-y-2"
            >
              <Target className="w-6 h-6" />
              <span className="font-semibold">Premium</span>
            </Button>
          </div>
        </div>

        {/* Market Highlights */}
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Market Highlights</h2>
            <Badge variant="outline" className={`${
              marketSentiment === 'bullish' ? 'text-green-600 border-green-300' :
              marketSentiment === 'bearish' ? 'text-red-600 border-red-300' :
              'text-yellow-600 border-yellow-300'
            }`}>
              {marketSentiment === 'bullish' ? '📈 Bullish' :
               marketSentiment === 'bearish' ? '📉 Bearish' : '⚖️ Neutral'}
            </Badge>
          </div>
          
          {/* Market Indices */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {marketIndices.slice(0, 3).map((index) => (
              <Card key={index.symbol} className="p-3">
                <div className="text-center">
                  <div className="text-xs font-medium text-gray-600">{index.name}</div>
                  <div className="text-lg font-bold">{index.value.toFixed(2)}</div>
                  <div className={`text-xs flex items-center justify-center space-x-1 ${
                    index.change >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {index.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>{index.changePercent >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Top Stocks */}
          <div className="space-y-2">
            {marketData.slice(0, 4).map((stock) => (
              <Card key={stock.symbol} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{stock.symbol}</div>
                    <div className="text-sm text-gray-600">${stock.price.toFixed(2)}</div>
                  </div>
                  <div className={`text-right ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <div className="font-semibold">
                      {stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}
                    </div>
                    <div className="text-sm">
                      {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Market News Section */}
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">{t('dashboard.marketNews')}</h2>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/market")}>
              {t('dashboard.viewAll')}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          <div className="space-y-3">
            {marketNews.slice(0, 3).map((news) => (
              <Card key={news.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className={`text-xs ${
                    news.sentiment === 'positive' ? 'text-green-600 border-green-300' :
                    news.sentiment === 'negative' ? 'text-red-600 border-red-300' :
                    'text-gray-600 border-gray-300'
                  }`}>
                    {news.category}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {new Date(news.publishedAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 leading-tight">{news.title}</h3>
                <p className="text-sm text-gray-600 mb-3 leading-relaxed">{news.summary}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{news.source}</span>
                  <div className="text-lg">
                    {news.sentiment === 'positive' ? '📈' : 
                     news.sentiment === 'negative' ? '📉' : '⚖️'}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Call-to-Action Section */}
        <div className="px-4 mb-6">
          <div className="bg-gradient-to-r from-brand-dark-green to-brand-brown rounded-2xl p-6 text-white text-center">
            <i className="fas fa-crown text-3xl text-brand-light-green mb-3"></i>
            <h3 className="text-xl font-bold mb-2">Ready for More?</h3>
            <p className="opacity-90 mb-4">Join our premium community and unlock advanced strategies, live sessions, and personalized guidance.</p>
            <Button 
              onClick={() => setLocation("/premium")}
              className="bg-brand-orange hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-full transition-colors touch-target"
            >
              Join Our Premium Community
            </Button>
          </div>
        </div>
      </div>

      <BottomNavigation />
      
      {/* Experience Level Modal */}
      <ExperienceLevelModal
        isOpen={showExperienceModal}
        onSelect={(level) => updateExperienceMutation.mutate(level)}
      />

      {/* Investment Style Modal */}
        <InvestmentStyleModal
          isOpen={showInvestmentStyleModal}
          onSelect={(style) => updateInvestmentStyleMutation.mutate(style)}
        />
      </div>
    </div>
  );
}
