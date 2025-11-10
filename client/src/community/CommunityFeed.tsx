import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, MessageCircle, Repeat2, Bookmark, TrendingUp, TrendingDown, Send, Hash } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CommunityPost, User } from "@shared/schema";

interface PostWithUser extends CommunityPost {
  user: {
    id: number;
    firstName: string;
    lastName: string;
    currentBadge: string;
  };
  isLiked?: boolean;
  isBookmarked?: boolean;
}

export default function CommunityFeed() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [newPost, setNewPost] = useState("");
  const [postType, setPostType] = useState("general");
  const [stockSymbol, setStockSymbol] = useState("");
  const [signalData, setSignalData] = useState({
    entry: "",
    target: "",
    stopLoss: ""
  });

  // Mock community posts for demonstration
  const mockPosts: PostWithUser[] = [
    {
      id: 1,
      userId: 1,
      content: "Just analyzed $AAPL earnings and I'm bullish for Q1 2025. The iPhone 16 cycle is showing strong momentum. #AAPL #BullishSignal",
      postType: "market_insight",
      stockSymbol: "AAPL",
      stockData: { price: 182.52, change: 2.45, changePercent: 1.36 },
      signalData: null,
      tags: ["#AAPL", "#BullishSignal"],
      likesCount: 24,
      commentsCount: 8,
      repostsCount: 3,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      user: {
        id: 1,
        firstName: "Sarah",
        lastName: "Chen",
        currentBadge: "PRO"
      },
      isLiked: false,
      isBookmarked: true
    },
    {
      id: 2,
      userId: 2,
      content: "Strong buy signal on $TSLA. Entry at $248, target $275, stop loss $240. Risk/reward looking great! #TSLA #TradingSignal",
      postType: "signal",
      stockSymbol: "TSLA",
      stockData: { price: 248.42, change: -5.67, changePercent: -2.23 },
      signalData: { entry: "248", target: "275", stopLoss: "240" },
      tags: ["#TSLA", "#TradingSignal"],
      likesCount: 18,
      commentsCount: 12,
      repostsCount: 6,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      user: {
        id: 2,
        firstName: "Mike",
        lastName: "Rodriguez",
        currentBadge: "EXPERT"
      },
      isLiked: true,
      isBookmarked: false
    },
    {
      id: 3,
      userId: 3,
      content: "Can someone explain the difference between market cap and enterprise value? Still learning the fundamentals. #Question #Learning",
      postType: "question",
      stockSymbol: null,
      stockData: null,
      signalData: null,
      tags: ["#Question", "#Learning"],
      likesCount: 7,
      commentsCount: 15,
      repostsCount: 1,
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      user: {
        id: 3,
        firstName: "Emma",
        lastName: "Johnson",
        currentBadge: "NEWBIE"
      },
      isLiked: false,
      isBookmarked: false
    }
  ];

  // Fetch posts from API
  const { data: posts = [], refetch } = useQuery<PostWithUser[]>({
    queryKey: ["/api/community/posts"],
    refetchInterval: 30000,
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (postData: any) => {
      const response = await fetch("/api/community/posts", {
        method: "POST",
        body: JSON.stringify(postData),
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
      setNewPost("");
      setStockSymbol("");
      setSignalData({ entry: "", target: "", stopLoss: "" });
      setPostType("general");
      toast({
        title: "Post created",
        description: "Your post has been shared with the community",
      });
    },
  });

  // Like/Unlike post mutation
  const likeMutation = useMutation({
    mutationFn: async (postId: number) => {
      const response = await fetch(`/api/community/posts/${postId}/like`, {
        method: "POST",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
    },
  });

  const handleLike = (postId: number) => {
    likeMutation.mutate(postId);
  };

  const handleCreatePost = () => {
    if (!newPost.trim()) return;

    const postData: any = {
      content: newPost,
      postType,
      tags: extractTags(newPost),
    };

    if (postType === "signal" && stockSymbol) {
      postData.stockSymbol = stockSymbol.toUpperCase();
      postData.signalData = signalData;
    }

    if (postType === "stock_discussion" && stockSymbol) {
      postData.stockSymbol = stockSymbol.toUpperCase();
    }

    createPostMutation.mutate(postData);
  };

  const extractTags = (content: string): string[] => {
    const tagRegex = /#\w+/g;
    return content.match(tagRegex) || [];
  };

  const formatTimeAgo = (date: Date | string | null) => {
    if (!date) return "Unknown";
    const now = new Date();
    const postDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case "NEWBIE": return "bg-gray-100 text-gray-800";
      case "TRADER": return "bg-blue-100 text-blue-800";
      case "PRO": return "bg-purple-100 text-purple-800";
      case "EXPERT": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const renderPostContent = (post: PostWithUser) => {
    if (post.postType === "signal" && post.signalData) {
      const signal = post.signalData as any;
      return (
        <div className="space-y-3">
          <p className="text-gray-900">{post.content}</p>
          
          {post.stockSymbol && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-blue-900">${post.stockSymbol}</span>
                <Badge className="bg-blue-600 text-white">Trading Signal</Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Entry:</span>
                  <div className="font-semibold">${signal.entry}</div>
                </div>
                <div>
                  <span className="text-gray-600">Target:</span>
                  <div className="font-semibold text-green-600">${signal.target}</div>
                </div>
                <div>
                  <span className="text-gray-600">Stop Loss:</span>
                  <div className="font-semibold text-red-600">${signal.stopLoss}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <p className="text-gray-900">{post.content}</p>
        
        {post.stockSymbol && post.stockData && (
          <div className="bg-gray-50 border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900">${post.stockSymbol}</span>
              <div className="flex items-center space-x-2">
                <span className="font-semibold">${(post.stockData as any).price}</span>
                <div className={`flex items-center space-x-1 ${
                  (post.stockData as any).change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(post.stockData as any).change >= 0 ? 
                    <TrendingUp className="w-4 h-4" /> : 
                    <TrendingDown className="w-4 h-4" />
                  }
                  <span className="text-sm">
                    {(post.stockData as any).changePercent >= 0 ? '+' : ''}
                    {(post.stockData as any).changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {post.tags && (post.tags as string[]).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {(post.tags as string[]).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-blue-600 border-blue-300">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Create Post */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback>
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{user?.firstName} {user?.lastName}</p>
                <Badge className="bg-blue-100 text-blue-800">TRADER</Badge>
              </div>
            </div>

            <Select value={postType} onValueChange={setPostType}>
              <SelectTrigger>
                <SelectValue placeholder="Select post type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Discussion</SelectItem>
                <SelectItem value="market_insight">Market Insight</SelectItem>
                <SelectItem value="signal">Trading Signal</SelectItem>
                <SelectItem value="question">Question</SelectItem>
                <SelectItem value="stock_discussion">Stock Discussion</SelectItem>
              </SelectContent>
            </Select>

            {(postType === "signal" || postType === "stock_discussion") && (
              <input
                type="text"
                placeholder="Stock Symbol (e.g. AAPL)"
                value={stockSymbol}
                onChange={(e) => setStockSymbol(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            )}

            {postType === "signal" && (
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Entry Price"
                  value={signalData.entry}
                  onChange={(e) => setSignalData(prev => ({ ...prev, entry: e.target.value }))}
                  className="px-3 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Target Price"
                  value={signalData.target}
                  onChange={(e) => setSignalData(prev => ({ ...prev, target: e.target.value }))}
                  className="px-3 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Stop Loss"
                  value={signalData.stopLoss}
                  onChange={(e) => setSignalData(prev => ({ ...prev, stopLoss: e.target.value }))}
                  className="px-3 py-2 border rounded-lg"
                />
              </div>
            )}

            <Textarea
              placeholder="Share your thoughts with the community... Use #tags for topics"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              className="min-h-[100px]"
            />

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                <Hash className="w-4 h-4 inline mr-1" />
                Use hashtags like #AAPL #BullishSignal #Earnings
              </div>
              <Button 
                onClick={handleCreatePost}
                disabled={!newPost.trim() || createPostMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Post
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts Feed */}
      <div className="space-y-4">
        {posts.map((post: PostWithUser) => (
          <Card key={post.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Post Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>
                        {post.user.firstName[0]}{post.user.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-semibold">{post.user.firstName} {post.user.lastName}</p>
                        <Badge className={getBadgeColor(post.user.currentBadge)}>
                          {post.user.currentBadge}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">{formatTimeAgo(post.createdAt)}</p>
                    </div>
                  </div>

                  {post.postType !== "general" && (
                    <Badge variant="outline">
                      {post.postType.replace("_", " ")}
                    </Badge>
                  )}
                </div>

                {/* Post Content */}
                {renderPostContent(post)}

                {/* Post Actions */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleLike(post.id)}
                      disabled={likeMutation.isPending}
                      className={`flex items-center space-x-1 transition-colors ${
                        post.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-current' : ''}`} />
                      <span className="text-sm">{post.likesCount || 0}</span>
                    </button>

                    <button className="flex items-center space-x-1 text-gray-500 hover:text-blue-500 transition-colors">
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-sm">{post.commentsCount}</span>
                    </button>

                    <button className="flex items-center space-x-1 text-gray-500 hover:text-green-500 transition-colors">
                      <Repeat2 className="w-4 h-4" />
                      <span className="text-sm">{post.repostsCount}</span>
                    </button>
                  </div>

                  <button className={`transition-colors ${
                    post.isBookmarked ? 'text-yellow-500' : 'text-gray-500 hover:text-yellow-500'
                  }`}>
                    <Bookmark className={`w-4 h-4 ${post.isBookmarked ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}