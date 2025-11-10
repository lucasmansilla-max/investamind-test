import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { 
  Heart, 
  MessageCircle, 
  Repeat2, 
  Bookmark, 
  Plus,
  TrendingUp,
  Target,
  MessageSquare,
  HelpCircle,
  Lightbulb,
  BarChart3
} from "lucide-react";
import EnhancedPostCard from "./EnhancedPostCard";
import MessageTypeModal from "./MessageTypeModal";
import PostCreationForm from "./PostCreationForm";
import CommentModal from "./CommentModal";

interface MessageType {
  id: string;
  name: string;
  icon: string;
  description: string;
  xpReward: number;
  color: string;
}

interface Comment {
  id: number;
  userId: number;
  content: string;
  createdAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

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
    level?: number;
    xp?: number;
  };
  isLiked?: boolean;
  isReposted?: boolean;
  isBookmarked?: boolean;
}

export default function CommunityFeedSimple() {
  const { toast } = useToast();
  const [newPost, setNewPost] = useState("");
  const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set());
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  
  // Enhanced post creation states
  const [showMessageTypeModal, setShowMessageTypeModal] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [selectedMessageType, setSelectedMessageType] = useState<MessageType | null>(null);

  // Fetch posts
  const { data: posts = [], isLoading } = useQuery<PostData[]>({
    queryKey: ["/api/community/posts"],
    refetchInterval: 30000,
  });

  // Enhanced post creation mutation
  const createPostMutation = useMutation({
    mutationFn: async (postData: any) => {
      const response = await fetch("/api/community/posts", {
        method: "POST",
        body: JSON.stringify({
          content: postData.content,
          postType: postData.messageType || 'general',
          messageType: postData.messageType,
          ticker: postData.ticker,
          signalData: postData.signalType ? {
            type: postData.signalType,
            entryPrice: postData.entryPrice,
            targetPrice: postData.targetPrice,
            stopLoss: postData.stopLoss,
            timeframe: postData.timeframe
          } : undefined,
          predictionData: postData.predictedPrice ? {
            currentPrice: 100, // Mock current price
            predictedPrice: postData.predictedPrice,
            timeframe: postData.timeframe,
            confidence: postData.confidence
          } : undefined,
          analysisType: postData.analysisType,
          tags: postData.tags,
          xpReward: postData.xpReward
        }),
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
      setShowPostForm(false);
      setSelectedMessageType(null);
      toast({
        title: "Post created successfully!",
        description: `Your ${selectedMessageType?.name} has been shared with the community`,
      });
    },
  });

  // Post creation flow handlers
  const handleStartPostCreation = () => {
    setShowMessageTypeModal(true);
  };

  const handleMessageTypeSelected = (messageType: MessageType) => {
    setSelectedMessageType(messageType);
    setShowMessageTypeModal(false);
    setShowPostForm(true);
  };

  const handlePostSubmit = (postData: any) => {
    createPostMutation.mutate(postData);
  };

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

  // Repost mutation
  const repostMutation = useMutation({
    mutationFn: async (postId: number) => {
      const response = await fetch(`/api/community/posts/${postId}/repost`, {
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

  const handleRepost = (postId: number) => {
    repostMutation.mutate(postId);
  };

  const handleCommentClick = (postId: number) => {
    setSelectedPostId(postId);
    setIsCommentModalOpen(true);
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
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

  return (
    <div className="space-y-4">
      {/* Enhanced Post Creation */}
      <Card className="border-2 border-dashed border-brand-light-green/50 hover:border-brand-orange/50 transition-colors">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-brand-light-green/10 rounded-full flex items-center justify-center">
              <Plus className="w-8 h-8 text-brand-dark-green" />
            </div>
            <h3 className="text-lg font-semibold text-brand-dark-green mb-2">
              Share with the Community
            </h3>
            <p className="text-gray-600 mb-4">
              Choose your post type to share market insights, predictions, or ask questions
            </p>
            <Button 
              onClick={handleStartPostCreation}
              disabled={createPostMutation.isPending}
              className="bg-brand-orange hover:bg-brand-orange/80 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Post
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Posts Feed */}
      {isLoading ? (
        <div className="text-center py-8">Loading posts...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No posts yet. Be the first to share something!
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <EnhancedPostCard
              key={post.id}
              post={post}
              onLike={handleLike}
              onComment={handleCommentClick}
              onRepost={handleRepost}
              onBookmark={() => {}}
            />
          ))}
        </div>
      )}

      {/* Enhanced Post Creation Modals */}
      <MessageTypeModal
        isOpen={showMessageTypeModal}
        onClose={() => setShowMessageTypeModal(false)}
        onSelectType={handleMessageTypeSelected}
      />

      {selectedMessageType && (
        <PostCreationForm
          isOpen={showPostForm}
          onClose={() => {
            setShowPostForm(false);
            setSelectedMessageType(null);
          }}
          messageType={selectedMessageType}
          onSubmit={handlePostSubmit}
        />
      )}

      {/* Comment Modal */}
      {selectedPostId && (
        <CommentModal
          isOpen={isCommentModalOpen}
          onClose={() => {
            setIsCommentModalOpen(false);
            setSelectedPostId(null);
          }}
          postId={selectedPostId}
        />
      )}
    </div>
  );
}