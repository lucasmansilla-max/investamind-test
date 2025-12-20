import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useProgress } from "@/hooks/use-progress";
import { useGamification } from "@/hooks/use-gamification";
import { useVideoProgress } from "@/hooks/use-video-progress";
import { useUserStories } from "@/hooks/use-user-stories";
import { useUserPosts } from "@/hooks/use-user-posts";
import { useLanguage } from "@/contexts/language-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import BottomNavigation from "@/bottom-navigation";
import ProgressBar from "@/progress-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import StoryCard from "@/components/stories/StoryCard";
import StoryCreationModal from "@/components/stories/StoryCreationModal";
import ImageUploader from "@/components/ImageUploader";
import { useLocation } from "wouter";
import { BarChart3, BookOpen, Clock, Film, MessageCircle, PlayCircle, Stars, UserCircle, Plus, Loader2, Camera } from "lucide-react";

export default function Profile() {
  const { user, refetch: refetchUser } = useAuth();
  const { t } = useLanguage();
  const { completedModules, totalModules, progressPercentage } = useProgress();
  const { userStats } = useGamification();
  const { videoProgress } = useVideoProgress();
  const [, setLocation] = useLocation();
  const [isCreateStoryModalOpen, setIsCreateStoryModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateAvatarMutation = useMutation({
    mutationFn: async (avatarData: string) => {
      // avatarData is already in base64 format with data URI
      const response = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ avatarUrl: avatarData }), // Send base64 as avatarUrl
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update profile photo");
      }

      return response.json();
    },
    onSuccess: async (data) => {
      toast({
        title: t('profile.photoUpdated') || "Photo updated!",
        description: t('profile.photoUpdatedDesc') || "Your profile photo has been updated successfully.",
      });
      
      // Update user data optimistically with new avatarUrl
      if (data?.user?.avatarUrl) {
        // Update auth query
        queryClient.setQueryData(["/api/auth/user"], (old: any) => ({
          ...old,
          user: { ...old?.user, avatarUrl: data.user.avatarUrl }
        }));
        
        // Update any other user queries
        queryClient.setQueryData(["/api/user"], (old: any) => ({
          ...old,
          user: { ...old?.user, avatarUrl: data.user.avatarUrl }
        }));
      }
      
      // Invalidate all user-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["stories"] }); // Stories show user avatars
      queryClient.invalidateQueries({ queryKey: ["user-stories"] }); // User's own stories
      
      // Force refetch to update UI immediately
      await refetchUser(); // Refetch user from auth hook
      await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
      await queryClient.refetchQueries({ queryKey: ["stories"] });
      await queryClient.refetchQueries({ queryKey: ["user-stories"] });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || "Error",
        description: error.message || "Failed to update profile photo.",
        variant: "destructive",
      });
    },
  });

  // Fetch user stories
  const {
    data: storiesData,
    fetchNextPage: fetchMoreStories,
    hasNextPage: hasMoreStories,
    isFetchingNextPage: isFetchingMoreStories,
    isLoading: isLoadingStories,
  } = useUserStories(user?.id || 0);

  // Fetch user posts/questions
  const {
    data: userPosts = [],
    isLoading: isLoadingPosts,
  } = useUserPosts(user?.id || 0);

  const allStories = storiesData?.pages.flatMap((page) => page.stories) || [];
  const completedVideos = videoProgress.totalVideosCompleted;

  // Derived labels
  const displayName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email : "Guest";
  // Type of user from useAuth already includes username in practice, but keep fallback just in case
  const username = (user as any)?.username || "@investor";
  const roleLabel = user?.role ? user.role.toUpperCase() : "FREE";

  return (
    <div className="page-wrapper">
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setLocation("/")}
              className="text-brand-brown hover:text-brand-orange transition-colors"
              aria-label="Back to home"
            >
              <i className="fas fa-arrow-left text-xl"></i>
            </button>
            <div className="flex items-center space-x-2">
              <UserCircle className="w-7 h-7 text-brand-dark-green" />
              <div>
                <h1 className="text-lg font-bold text-gray-900">Profile</h1>
                <p className="text-xs text-gray-500">Your learning and community snapshot</p>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 pt-4 space-y-6">
          {/* User summary */}
          <section>
            <Card className="shadow-sm">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center space-x-4">
                  <div className="relative group">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={user?.avatarUrl || undefined} alt={displayName} className="object-cover object-center" />
                      <AvatarFallback className="bg-gradient-to-br from-brand-light-green to-brand-dark-green text-white text-xl">
                        {displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ImageUploader
                        onImageSelected={(url) => updateAvatarMutation.mutate(url)}
                        buttonText=""
                        buttonVariant="ghost"
                        buttonSize="sm"
                        currentImage={user?.avatarUrl}
                      />
                      <Camera className="w-6 h-6 text-white absolute pointer-events-none" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold text-gray-900 truncate">{displayName}</h2>
                    <p className="text-xs text-gray-500 truncate">{username}</p>
                    <div className="mt-1 flex items-center space-x-2">
                      <Badge className="text-xs bg-emerald-100 text-emerald-800 border-emerald-200">
                        {roleLabel}
                      </Badge>
                      {user?.onboardingCompleted && (
                        <Badge variant="outline" className="text-[10px] flex items-center space-x-1">
                          <Stars className="w-3 h-3 mr-1" />
                          <span>{t('profile.onboardingComplete') || "Onboarding complete"}</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Stories section */}
          <section>
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center space-x-2">
                    <PlayCircle className="w-4 h-4 text-brand-dark-green" />
                    <span>{t('profile.yourStories')}</span>
                  </span>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs px-0"
                    onClick={() => setLocation("/stories")}
                  >
                    {t('profile.viewAll')}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {isLoadingStories ? (
                  <div className="grid grid-cols-1 gap-3">
                    {[1, 2].map((idx) => (
                      <Skeleton key={idx} className="h-24 w-full" />
                    ))}
                  </div>
                ) : allStories.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-xs text-gray-500 mb-3">
                      {t('profile.storiesDescription')}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setIsCreateStoryModalOpen(true)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {t('profile.createFirstStory')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-2 font-bold hover:bg-accent hover:text-accent-foreground"
                      onClick={() => setIsCreateStoryModalOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-1.5 font-bold stroke-[3]" />
                      <span className="font-bold">{t('profile.createNewStory')}</span>
                    </Button>
                    {allStories.slice(0, 3).map((story) => (
                      <StoryCard key={story.id} story={story} showDelete={true} />
                    ))}
                    {allStories.length > 3 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setLocation("/stories")}
                      >
                        {t('profile.viewAllStories', { count: allStories.length })}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Course & video progress */}
          <section>
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-brand-dark-green" />
                    <span>Learning progress</span>
                  </span>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs px-0"
                    onClick={() => setLocation("/learning")}
                  >
                    Go to Learn
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {/* Overall courses progress */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600 flex items-center space-x-1">
                      <BookOpen className="w-3 h-3" />
                      <span>Courses</span>
                    </span>
                    <span className="text-xs font-medium text-gray-700">
                      {completedModules}/{totalModules} completed
                    </span>
                  </div>
                  <ProgressBar progress={progressPercentage} />
                  <p className="mt-1 text-[11px] text-gray-500">
                    Keep going! Each completed module unlocks new skills and badges.
                  </p>
                </div>

                {/* Videos summary (derived) */}
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600 flex items-center space-x-1">
                      <Film className="w-3 h-3" />
                      <span>Videos</span>
                    </span>
                    <span className="text-xs font-medium text-gray-700">
                      {completedVideos} completed
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-gray-600">
                    <div className="p-2 rounded-lg bg-gray-50 flex flex-col items-center space-y-1">
                      <PlayCircle className="w-4 h-4 text-brand-dark-green" />
                      <span>Watch more lessons</span>
                    </div>
                    <div className="p-2 rounded-lg bg-gray-50 flex flex-col items-center space-y-1">
                      <Clock className="w-4 h-4 text-brand-orange" />
                      <span>Resume where you left off</span>
                    </div>
                    <div className="p-2 rounded-lg bg-gray-50 flex flex-col items-center space-y-1">
                      <Stars className="w-4 h-4 text-brand-blue" />
                      <span>Unlock achievements</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* User posts/questions */}
          <section>
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center space-x-2">
                    <MessageCircle className="w-4 h-4 text-brand-dark-green" />
                    <span>Your posts</span>
                  </span>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs px-0"
                    onClick={() => setLocation("/community")}
                  >
                    Go to Community
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {isLoadingPosts ? (
                  <div className="space-y-2">
                    {[1, 2].map((idx) => (
                      <Skeleton key={idx} className="h-16 w-full" />
                    ))}
                  </div>
                ) : userPosts.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-xs text-gray-500 mb-3">
                      You haven't posted any questions or insights yet.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setLocation("/community")}
                    >
                      Start a discussion
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userPosts.slice(0, 3).map((post) => (
                      <div
                        key={post.id}
                        className="p-3 rounded-lg bg-gray-50 border border-gray-100 hover:border-brand-light-green transition-colors cursor-pointer"
                        onClick={() => setLocation("/community")}
                      >
                        <p className="text-xs text-gray-800 line-clamp-2 mb-1">
                          {post.content}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-gray-500">
                          <span>{post.postType}</span>
                          <div className="flex items-center space-x-3">
                            <span>{post.likesCount} likes</span>
                            <span>{post.commentsCount} comments</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {userPosts.length > 3 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setLocation("/community")}
                      >
                        View all posts
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </main>

        <BottomNavigation />
      </div>

      {/* Story creation modal */}
      <StoryCreationModal
        open={isCreateStoryModalOpen}
        onOpenChange={setIsCreateStoryModalOpen}
      />
    </div>
  );
}
