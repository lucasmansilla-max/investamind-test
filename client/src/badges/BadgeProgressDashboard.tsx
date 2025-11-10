import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Trophy, Star, Users, TrendingUp, Award, Crown, Zap, Target } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/contexts/language-context";

interface BadgeLevel {
  level: string;
  name: string;
  icon: string;
  color: string;
  requirements: string[];
  points: number;
  benefits: string[];
}

interface UserProgress {
  currentBadge: string;
  totalPoints: number;
  communityPosts: number;
  helpfulAnswers: number;
  referralCount: number;
  predictionAccuracy: number;
  daysActive: number;
  nextBadgeProgress: number;
}

function BadgeProgressDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const badgeLevels: BadgeLevel[] = [
    {
      level: "NEWBIE",
      name: "Investment Newbie",
      icon: "🌱",
      color: "bg-gray-100 text-gray-800 border-gray-300",
      requirements: ["New to investing", "0-30 days active"],
      points: 0,
      benefits: ["Access to beginner content", "Community participation"]
    },
    {
      level: "TRADER",
      name: "Active Trader",
      icon: "📈",
      color: "bg-blue-100 text-blue-800 border-blue-300",
      requirements: ["30+ days active", "10+ community posts", "5+ helpful answers"],
      points: 500,
      benefits: ["Advanced content access", "Trading signal alerts", "Priority support"]
    },
    {
      level: "PRO",
      name: "Pro Investor",
      icon: "💎",
      color: "bg-purple-100 text-purple-800 border-purple-300",
      requirements: ["60+ days active", "70%+ prediction accuracy", "OR 10+ confirmed referrals"],
      points: 2000,
      benefits: ["Exclusive webinars", "Portfolio analysis tools", "Expert insights"]
    },
    {
      level: "EXPERT",
      name: "Market Expert",
      icon: "👑",
      color: "bg-yellow-100 text-yellow-800 border-yellow-300",
      requirements: ["Professional credentials", "Community leadership", "Verified expertise"],
      points: 5000,
      benefits: ["Monetize predictions", "Verified expert badge", "Revenue sharing"]
    }
  ];

  // Mock user progress - in production this would come from API
  const mockProgress: UserProgress = {
    currentBadge: "TRADER",
    totalPoints: 1250,
    communityPosts: 23,
    helpfulAnswers: 12,
    referralCount: 4,
    predictionAccuracy: 68.5,
    daysActive: 45,
    nextBadgeProgress: 62.5
  };

  const { data: userProgress = mockProgress } = useQuery({
    queryKey: ["/api/badges/progress"],
    queryFn: async () => mockProgress,
  });

  const getCurrentBadgeIndex = () => {
    return badgeLevels.findIndex(badge => badge.level === userProgress.currentBadge);
  };

  const getNextBadge = () => {
    const currentIndex = getCurrentBadgeIndex();
    return currentIndex < badgeLevels.length - 1 ? badgeLevels[currentIndex + 1] : null;
  };

  const getCurrentBadge = () => {
    return badgeLevels[getCurrentBadgeIndex()];
  };

  const calculateProgress = (requirement: string): number => {
    if (requirement.includes("days active")) {
      const target = parseInt(requirement.match(/\d+/)?.[0] || "30");
      return Math.min((userProgress.daysActive / target) * 100, 100);
    }
    if (requirement.includes("community posts")) {
      const target = parseInt(requirement.match(/\d+/)?.[0] || "10");
      return Math.min((userProgress.communityPosts / target) * 100, 100);
    }
    if (requirement.includes("helpful answers")) {
      const target = parseInt(requirement.match(/\d+/)?.[0] || "5");
      return Math.min((userProgress.helpfulAnswers / target) * 100, 100);
    }
    if (requirement.includes("prediction accuracy")) {
      const target = parseInt(requirement.match(/\d+/)?.[0] || "70");
      return Math.min((userProgress.predictionAccuracy / target) * 100, 100);
    }
    if (requirement.includes("referrals")) {
      const target = parseInt(requirement.match(/\d+/)?.[0] || "10");
      return Math.min((userProgress.referralCount / target) * 100, 100);
    }
    return 0;
  };

  const currentBadge = getCurrentBadge();
  const nextBadge = getNextBadge();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Current Badge Status */}
      <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-4xl">{currentBadge.icon}</div>
              <div>
                <h2 className="text-2xl font-bold">{currentBadge.name}</h2>
                <p className="opacity-90">Current Badge Level</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{userProgress.totalPoints}</div>
              <div className="opacity-90">Total Points</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress to Next Badge */}
      {nextBadge && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="w-5 h-5" />
              <span>Progress to {nextBadge.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Overall Progress</span>
                <span className="text-sm font-semibold">{userProgress.nextBadgeProgress.toFixed(1)}%</span>
              </div>
              <Progress value={userProgress.nextBadgeProgress} className="h-3" />
              
              <div className="grid gap-4 mt-6">
                <h4 className="font-semibold text-gray-900">Requirements:</h4>
                {nextBadge.requirements.map((requirement, index) => {
                  const progress = calculateProgress(requirement);
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{requirement}</span>
                        <span className="text-sm font-semibold">{progress.toFixed(0)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Badge Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="w-5 h-5" />
            <span>Badge Journey</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {badgeLevels.map((badge, index) => {
              const isCompleted = getCurrentBadgeIndex() > index;
              const isCurrent = badge.level === userProgress.currentBadge;
              
              return (
                <div key={badge.level} className="flex items-start space-x-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                    isCompleted ? 'bg-green-100 border-2 border-green-500' :
                    isCurrent ? 'bg-blue-100 border-2 border-blue-500' :
                    'bg-gray-100 border-2 border-gray-300'
                  }`}>
                    {isCompleted ? '✅' : isCurrent ? '⚡' : badge.icon}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{badge.name}</h3>
                      <Badge className={badge.color}>{badge.level}</Badge>
                      {isCurrent && (
                        <Badge className="bg-blue-600 text-white">Current</Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">Requirements:</h4>
                        <ul className="text-sm text-gray-600 ml-4">
                          {badge.requirements.map((req, reqIndex) => (
                            <li key={reqIndex} className="list-disc">{req}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">Benefits:</h4>
                        <ul className="text-sm text-gray-600 ml-4">
                          {badge.benefits.map((benefit, benefitIndex) => (
                            <li key={benefitIndex} className="list-disc">{benefit}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{badge.points}+</div>
                    <div className="text-sm text-gray-500">points</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Current Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{userProgress.daysActive}</div>
            <div className="text-sm text-gray-600">Days Active</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{userProgress.communityPosts}</div>
            <div className="text-sm text-gray-600">Community Posts</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{userProgress.predictionAccuracy.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Prediction Accuracy</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{userProgress.referralCount}</div>
            <div className="text-sm text-gray-600">Referrals</div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
          <Users className="w-4 h-4 mr-2" />
          Invite Friends
        </Button>
        <Button variant="outline" className="flex-1">
          <TrendingUp className="w-4 h-4 mr-2" />
          View Leaderboard
        </Button>
      </div>
    </div>
  );
}

export default BadgeProgressDashboard;