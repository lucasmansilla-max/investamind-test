import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Repeat2, Bookmark, TrendingUp, TrendingDown, ShieldOff, ShieldCheck } from "lucide-react";
import { MessageType } from "./MessageTypeModal";
import RoleBadge from "@/components/RoleBadge";
import { useSubscriptionStatus } from "@/hooks/use-subscription-status";
import { useLanguage } from "@/contexts/language-context";
import { useLocation } from "wouter";

interface PostData {
  id: number;
  userId: number;
  content: string;
  postType: string;
  messageType?: string;
  ticker?: string;
  signalData?: {
    type: string;
    entryPrice: number;
    targetPrice?: number;
    stopLoss?: number;
    timeframe?: string;
  };
  predictionData?: {
    currentPrice: number;
    predictedPrice: number;
    timeframe: string;
    confidence: number;
  };
  analysisType?: string;
  tags?: string[];
  xpReward?: number;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  createdAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    currentBadge: string;
    role?: string;
    level?: number;
    xp?: number;
  };
  isLiked?: boolean;
  isReposted?: boolean;
  isBookmarked?: boolean;
  deletedAt?: string | null;
}

interface EnhancedPostCardProps {
  post: PostData;
  onLike: (postId: number) => void;
  onComment: (postId: number) => void;
  onRepost: (postId: number) => void;
  onBookmark: (postId: number) => void;
  onDeactivate?: (postId: number) => void;
  onReactivate?: (postId: number) => void;
}

const messageTypeConfig = {
  signal: { icon: '⚡', color: '#F44336', bgColor: '#ffebee' },
  prediction: { icon: '🎯', color: '#FF9800', bgColor: '#fff3e0' },
  analysis: { icon: '📊', color: '#4CAF50', bgColor: '#e8f5e0' },
  education: { icon: '🎓', color: '#9C27B0', bgColor: '#f3e5f5' },
  news: { icon: '📰', color: '#2196F3', bgColor: '#e3f2fd' },
  question: { icon: '❓', color: '#607D8B', bgColor: '#eceff1' },
  general: { icon: '💬', color: '#795548', bgColor: '#efebe9' }
};

const getUserLevel = (xp: number = 0) => {
  if (xp >= 1000) return { level: 5, title: 'Market Master', badge: '👑' };
  if (xp >= 600) return { level: 4, title: 'Trading Expert', badge: '⭐' };
  if (xp >= 300) return { level: 3, title: 'Market Analyst', badge: '📊' };
  if (xp >= 100) return { level: 2, title: 'Learning Investor', badge: '📈' };
  return { level: 1, title: 'Rookie Trader', badge: '🔰' };
};

export default function EnhancedPostCard({ post, onLike, onComment, onRepost, onBookmark, onDeactivate, onReactivate }: EnhancedPostCardProps) {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [showFullContent, setShowFullContent] = useState(false);
  const typeConfig = messageTypeConfig[post.messageType as keyof typeof messageTypeConfig] || messageTypeConfig.general;
  const userLevel = getUserLevel(post.user.xp);
  const { data: subscriptionData } = useSubscriptionStatus();
  const isAdmin = subscriptionData?.role === 'admin';
  const isDeactivated = !!post.deletedAt;

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return t("community.minutesAgo").replace("{minutes}", diffMins.toString());
    if (diffHours < 24) return t("community.hoursAgo").replace("{hours}", diffHours.toString());
    return t("community.daysAgo").replace("{days}", diffDays.toString());
  };

  const TradingSignalDisplay = ({ data }: { data: any }) => (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 my-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge className="bg-red-500 text-white px-3 py-1">
            {data.type} SIGNAL
          </Badge>
          {post.ticker && (
            <Badge variant="outline" className="font-mono font-bold">
              {post.ticker}
            </Badge>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Entry:</span>
          <span className="font-semibold">${data.entryPrice}</span>
        </div>
        {data.targetPrice && (
          <div className="flex justify-between">
            <span className="text-gray-600">Target:</span>
            <span className="font-semibold text-green-600">${data.targetPrice}</span>
          </div>
        )}
        {data.stopLoss && (
          <div className="flex justify-between">
            <span className="text-gray-600">Stop Loss:</span>
            <span className="font-semibold text-red-600">${data.stopLoss}</span>
          </div>
        )}
        {data.timeframe && (
          <div className="flex justify-between">
            <span className="text-gray-600">Timeframe:</span>
            <span className="font-semibold">{data.timeframe}</span>
          </div>
        )}
      </div>
    </div>
  );

  const PredictionDisplay = ({ data }: { data: any }) => {
    const isPositive = data.predictedPrice > data.currentPrice;
    const changePercent = ((data.predictedPrice - data.currentPrice) / data.currentPrice * 100);

    return (
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 my-3">
        <div className="flex items-center justify-between mb-3">
          <Badge className="bg-orange-500 text-white px-3 py-1">
            PRICE PREDICTION
          </Badge>
          {post.ticker && (
            <Badge variant="outline" className="font-mono font-bold">
              {post.ticker}
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-center">
            <div className="text-sm text-gray-600">Current</div>
            <div className="text-lg font-bold">${data.currentPrice}</div>
          </div>
          <div className="flex items-center">
            {isPositive ? (
              <TrendingUp className="w-6 h-6 text-green-500" />
            ) : (
              <TrendingDown className="w-6 h-6 text-red-500" />
            )}
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">Predicted</div>
            <div className="text-lg font-bold">${data.predictedPrice}</div>
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Timeframe: {data.timeframe}</span>
          <span className="text-gray-600">Confidence: {data.confidence}/10</span>
        </div>
        <div className={`text-center mt-2 font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? '+' : ''}{changePercent.toFixed(1)}%
        </div>
      </div>
    );
  };

  const StockTickerDisplay = ({ ticker }: { ticker: string }) => (
    <div className="bg-brand-light-green text-white rounded-lg px-4 py-2 my-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Badge className="bg-white/20 text-white font-mono">
          {ticker}
        </Badge>
        <span className="text-sm">Real-time data coming soon</span>
      </div>
    </div>
  );

  return (
    <Card className={`mb-4 transition-all duration-200 hover:shadow-lg border-l-4 relative ${isDeactivated ? 'opacity-60' : ''}`} 
          style={{ borderLeftColor: typeConfig.color }}>
      {isDeactivated && (
        <div className="absolute inset-0 bg-gray-100/50 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center">
          <Badge className="bg-red-500 text-white px-4 py-2 text-sm font-semibold">
            🚫 {t("community.deactivated")}
          </Badge>
        </div>
      )}
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4 pb-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setLocation("/profile")}
                className="flex items-center space-x-3 group"
                aria-label="Go to profile"
              >
                <Avatar className="w-10 h-10 group-hover:scale-105 transition-transform duration-200">
                  <AvatarFallback className="bg-brand-dark-green text-white">
                    {post.user.firstName[0]}{post.user.lastName[0]}
                  </AvatarFallback>
                </Avatar>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-brand-dark-green">
                    {post.user.firstName} {post.user.lastName}
                  </span>
                  {post.user.role && (
                    <RoleBadge role={post.user.role} />
                  )}
                  <Badge className="bg-brand-orange/10 text-brand-orange text-xs">
                    {post.user.currentBadge || 'TRADER'}
                  </Badge>
                  <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-yellow-800 text-xs">
                    {userLevel.badge} {userLevel.title}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>{formatTimeAgo(post.createdAt)}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <span className="text-lg">{typeConfig.icon}</span>
                    <span className="capitalize">{post.messageType || 'general'}</span>
                  </div>
                </div>
              </div>
              </button>
            </div>
            {post.xpReward && (
              <Badge className="bg-brand-light-green/20 text-brand-dark-green">
                +{post.xpReward} XP
              </Badge>
            )}
            {post.postType === 'ad' || post.postType === 'advertisement' ? (
              <Badge className="bg-red-100 text-red-800 border-red-200">
                📢 {t("community.announcement")}
              </Badge>
            ) : null}
            {isAdmin && (
              <>
                {isDeactivated && onReactivate ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReactivate(post.id)}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    title={t("community.reactivatePost")}
                  >
                    <ShieldCheck className="w-4 h-4" />
                  </Button>
                ) : !isDeactivated && onDeactivate ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeactivate(post.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    title={t("community.deactivatePost")}
                  >
                    <ShieldOff className="w-4 h-4" />
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          <div className={showFullContent ? '' : 'line-clamp-4'}>
            {post.content}
          </div>
          {post.content.length > 200 && (
            <button
              onClick={() => setShowFullContent(!showFullContent)}
              className="text-brand-orange text-sm mt-1 hover:underline"
            >
              {showFullContent ? t("community.showLess") : t("community.showMore")}
            </button>
          )}

          {/* Special Content Displays */}
          {post.signalData && <TradingSignalDisplay data={post.signalData} />}
          {post.predictionData && <PredictionDisplay data={post.predictionData} />}
          {post.ticker && !post.signalData && !post.predictionData && (
            <StockTickerDisplay ticker={post.ticker} />
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {post.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="flex items-center space-x-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onLike(post.id)}
              className={`flex items-center space-x-1 hover:text-red-500 ${
                post.isLiked ? 'text-red-500' : 'text-gray-500'
              }`}
            >
              <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-current' : ''}`} />
              <span className="text-sm">{post.likesCount}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onComment(post.id)}
              className="flex items-center space-x-1 hover:text-blue-500 text-gray-500"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm">{post.commentsCount}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRepost(post.id)}
              className={`flex items-center space-x-1 hover:text-green-500 ${
                post.isReposted ? 'text-green-500' : 'text-gray-500'
              }`}
            >
              <Repeat2 className="w-4 h-4" />
              <span className="text-sm">{post.repostsCount}</span>
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onBookmark(post.id)}
            className={`hover:text-yellow-500 ${
              post.isBookmarked ? 'text-yellow-500' : 'text-gray-500'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${post.isBookmarked ? 'fill-current' : ''}`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}