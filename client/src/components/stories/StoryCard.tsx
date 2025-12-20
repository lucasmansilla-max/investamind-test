import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Heart, Eye, Trash2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";

export interface Story {
  id: number;
  content: string;
  imageData: string | null;
  mimeType: string | null;
  expiresAt: string | null;
  isActive: boolean;
  likesCount: number;
  viewsCount: number;
  createdAt: string | null;
  user: {
    id: number;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    role: string | null;
  };
  isLikedByCurrentUser?: boolean;
}

interface StoryCardProps {
  story: Story;
  showDelete?: boolean;
}

export default function StoryCard({ story, showDelete = false }: StoryCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLiked, setIsLiked] = useState(story.isLikedByCurrentUser || false);
  const [likesCount, setLikesCount] = useState(story.likesCount);
  const [hasIncrementedView, setHasIncrementedView] = useState(false);

  // Sync local state with prop changes (when story data updates from query)
  React.useEffect(() => {
    setIsLiked(story.isLikedByCurrentUser || false);
    setLikesCount(story.likesCount);
  }, [story.isLikedByCurrentUser, story.likesCount]);

  // Increment view count on mount
  React.useEffect(() => {
    if (!hasIncrementedView) {
      fetch(`/api/stories/${story.id}/view`, {
        method: "POST",
        credentials: "include",
      }).catch(() => {
        // Silently fail, view increment is not critical
      });
      setHasIncrementedView(true);
    }
  }, [story.id, hasIncrementedView]);

  const likeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/stories/${story.id}/like`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to toggle like");
      }

      return response.json();
    },
    onSuccess: (data: { liked: boolean; likesCount: number }) => {
      // Update local state optimistically
      setIsLiked(data.liked);
      setLikesCount(data.likesCount);
      
      // Invalidate all stories queries to ensure persistence
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: ["user-stories"], exact: false }); // Invalidate all user-stories queries regardless of userId
      
      // Also update the query data optimistically for immediate UI update
      queryClient.setQueriesData(
        { queryKey: ["stories"] },
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages?.map((page: any) => ({
              ...page,
              stories: page.stories?.map((s: Story) =>
                s.id === story.id
                  ? { ...s, isLikedByCurrentUser: data.liked, likesCount: data.likesCount }
                  : s
              ),
            })),
          };
        }
      );
      
      // Update user-stories queries (with userId in key)
      queryClient.setQueriesData(
        { queryKey: ["user-stories"], exact: false },
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages?.map((page: any) => ({
              ...page,
              stories: page.stories?.map((s: Story) =>
                s.id === story.id
                  ? { ...s, isLikedByCurrentUser: data.liked, likesCount: data.likesCount }
                  : s
              ),
            })),
          };
        }
      );
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update like. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/stories/${story.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete story");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Story deleted",
        description: "Your story has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: ["user-stories"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete story. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLike = () => {
    likeMutation.mutate();
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this story?")) {
      deleteMutation.mutate();
    }
  };

  const displayName = story.user.firstName && story.user.lastName
    ? `${story.user.firstName} ${story.user.lastName}`
    : story.user.username || "Anonymous";

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const timeAgo = story.createdAt
    ? formatDistanceToNow(new Date(story.createdAt), { addSuffix: true })
    : "Just now";

  const isOwnStory = user?.id === story.user.id;

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        {/* Header with user info */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={story.user.avatarUrl || undefined} alt={displayName} className="object-cover object-center"/>
              <AvatarFallback className="bg-gradient-to-br from-brand-light-green to-brand-dark-green text-white text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{displayName}</h3>
              <div className="flex items-center space-x-2">
                {story.user.role && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {story.user.role.toUpperCase()}
                  </Badge>
                )}
                <span className="text-xs text-gray-500 flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{timeAgo}</span>
                </span>
              </div>
            </div>
          </div>
          {showDelete && isOwnStory && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="w-4 h-4 text-gray-500 hover:text-destructive" />
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="space-y-3">
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{story.content}</p>
          {story.imageData && story.imageData.trim() !== '' && (
            <div className="rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
              <img
                src={story.imageData}
                alt="Story attachment"
                className="w-full h-auto object-contain"
                style={{ 
                  maxHeight: '500px',
                  display: 'block',
                  margin: '0 auto'
                }}
                onError={(e) => {
                  console.error('Failed to load image:', story.imageData?.substring(0, 100));
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-3 space-x-2 ${isLiked ? "text-red-500" : "text-gray-600"}`}
            onClick={handleLike}
            disabled={likeMutation.isPending}
          >
            <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
            <span className="text-xs font-medium">{likesCount}</span>
          </Button>

          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <Eye className="w-4 h-4" />
            <span>{story.viewsCount} views</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
