import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { LearningModule, UserProgress, ModuleVideo } from "@shared/schema";
import VideoPlayer from "@/components/VideoPlayer";
import { useHasPremiumAccess } from "@/hooks/use-subscription-status";
import PremiumGate from "@/components/upgrade-prompts/PremiumGate";
import { Play, CheckCircle, Lock, ChevronRight, Clock, BookOpen } from "lucide-react";

interface ModuleWithVideos extends LearningModule {
  videos?: ModuleVideo[];
}

// Component for individual video list item
function VideoListItem({ 
  video, 
  index, 
  isSelected, 
  onSelect,
  queryClient
}: { 
  video: ModuleVideo; 
  index: number; 
  isSelected: boolean;
  onSelect: () => void;
  queryClient: any;
}) {
  const { data: videoProgress } = useQuery({
    queryKey: ["/api/progress/video", video.id],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", `/api/progress/video/${video.id}`);
        if (!res.ok) {
          return null;
        }
        return await res.json();
      } catch (err) {
        return null;
      }
    },
    enabled: !!video.id,
  });

  const isCompleted = videoProgress?.completed || (videoProgress?.completionPercentage || 0) >= 90;
  const progressPercentage = videoProgress?.completionPercentage || 0;

  const formatDuration = (seconds: number | null | undefined): string => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={`group cursor-pointer transition-all rounded-lg border ${
        isSelected 
          ? "border-brand-orange bg-brand-orange/5 shadow-md" 
          : isCompleted
          ? "border-brand-dark-green bg-brand-light-green/5 hover:bg-brand-light-green/10"
          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
      }`}
      onClick={onSelect}
    >
      <div className="p-3">
        <div className="flex items-start space-x-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium transition-all ${
            isSelected 
              ? "bg-brand-orange text-white scale-110" 
              : isCompleted
              ? "bg-brand-dark-green text-white"
              : "bg-gray-200 text-gray-600 group-hover:bg-gray-300"
          }`}>
            {isCompleted ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              index + 1
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className={`font-medium text-sm leading-tight ${
                  isSelected 
                    ? "text-brand-orange font-semibold" 
                    : isCompleted 
                    ? "text-brand-dark-green" 
                    : "text-gray-900"
                }`}>
                  {video.title}
                </h4>
                {video.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{video.description}</p>
                )}
              </div>
              {isSelected && (
                <ChevronRight className="w-4 h-4 text-brand-orange flex-shrink-0 mt-0.5" />
              )}
            </div>
            
            {/* Progress and Duration */}
            <div className="mt-2 space-y-1.5">
              {videoProgress && progressPercentage > 0 && !isCompleted && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Progreso</span>
                    <span className="text-gray-600 font-medium">{Math.min(progressPercentage, 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div 
                      className="bg-brand-orange h-1 rounded-full transition-all"
                      style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {isCompleted && (
                <div className="flex items-center gap-1.5 text-xs">
                  <CheckCircle className="w-3 h-3 text-brand-dark-green" />
                  <span className="text-brand-dark-green font-medium">Completado</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Module() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);

  const moduleId = params?.id ? parseInt(params.id) : NaN;

  // Redirect if invalid module ID
  if (isNaN(moduleId) || moduleId <= 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center">
          <i className="fas fa-exclamation-circle text-4xl text-gray-400 mb-4"></i>
          <h2 className="text-xl font-bold text-gray-600 mb-2">Invalid module ID</h2>
          <Button onClick={() => setLocation("/learning")}>
            Back to Learning Path
          </Button>
        </div>
      </div>
    );
  }

  const { data: module, isLoading } = useQuery<ModuleWithVideos>({
    queryKey: ["/api/modules", moduleId],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", `/api/modules/${moduleId}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch module: ${res.statusText}`);
        }
        return (await res.json()) as ModuleWithVideos;
      } catch (err) {
        console.error("Error fetching module:", err);
        throw err;
      }
    },
    enabled: !isNaN(moduleId) && moduleId > 0,
  });

  // Get user progress for module
  const { data: userProgress } = useQuery<UserProgress[]>({
    queryKey: ["/api/progress"],
  });

  const moduleProgress = userProgress?.find(p => p.moduleId === moduleId);

  // Check premium access
  const { hasPremiumAccess } = useHasPremiumAccess();
  const hasAccess = module?.isPremium ? hasPremiumAccess : true;

  // Auto-select first video if available
  const videos = module?.videos || [];
  
  // Memoize video IDs to ensure stable query key
  const videoIds = useMemo(() => videos.map(v => v.id), [videos]);
  
  // Calculate module progress - MUST be called before any conditional returns
  const { data: allVideoProgress } = useQuery({
    queryKey: ["/api/progress/videos", videoIds],
    queryFn: async () => {
      if (videoIds.length === 0) return [];
      const progressPromises = videoIds.map(async (videoId: number) => {
        try {
          const res = await apiRequest("GET", `/api/progress/video/${videoId}`);
          if (res.ok) {
            return await res.json();
          }
          return null;
        } catch {
          return null;
        }
      });
      return await Promise.all(progressPromises);
    },
    enabled: videoIds.length > 0 && !!module,
  });

  const completedVideos = allVideoProgress?.filter((progress: any) => 
    progress?.completed || (progress?.completionPercentage || 0) >= 90
  ).length || 0;

  const firstVideo = videos.length > 0 ? videos[0] : null;
  const selectedVideo = selectedVideoId 
    ? videos.find(v => v.id === selectedVideoId) 
    : firstVideo;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-brand-orange rounded-full flex items-center justify-center mb-4 mx-auto animate-pulse">
            <i className="fas fa-book text-white text-xl"></i>
          </div>
          <p className="text-brand-brown font-medium">Loading module...</p>
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center">
          <i className="fas fa-exclamation-circle text-4xl text-gray-400 mb-4"></i>
          <h2 className="text-xl font-bold text-gray-600 mb-2">Module not found</h2>
          <Button onClick={() => setLocation("/learning")}>
            Back to Learning Path
          </Button>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="bg-brand-brown text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setLocation("/learning")}
              className="text-white touch-target"
            >
              <i className="fas fa-arrow-left text-xl"></i>
            </button>
            <h1 className="font-semibold">{module.title}</h1>
            <div className="w-6"></div>
          </div>
        </div>

        <div className="p-6">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-600">Este módulo no tiene videos aún.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  const moduleProgressPercentage = videos.length > 0 ? (completedVideos / videos.length) * 100 : 0;

  // Handle video completion - navigate to next video
  const handleVideoComplete = () => {
    if (!selectedVideo) return;
    const currentIndex = videos.findIndex(v => v.id === selectedVideo.id);
    if (currentIndex < videos.length - 1) {
      const nextVideo = videos[currentIndex + 1];
      setSelectedVideoId(nextVideo.id);
      toast({
        title: "Video completado",
        description: `Continuando con: ${nextVideo.title}`,
        duration: 3000,
      });
    } else {
      toast({
        title: "¡Felicidades!",
        description: "Has completado todos los videos de este módulo",
        duration: 3000,
      });
    }
  };

  // Get next video
  const currentIndex = selectedVideo ? videos.findIndex(v => v.id === selectedVideo.id) : -1;
  const nextVideo = currentIndex >= 0 && currentIndex < videos.length - 1 ? videos[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button 
              onClick={() => setLocation("/learning")}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <i className="fas fa-arrow-left text-xl"></i>
            </button>
            <div className="flex-1 mx-4">
              <h1 className="text-lg font-semibold text-gray-900 truncate">{module.title}</h1>
              {module.description && (
                <p className="text-xs text-gray-500 truncate">{module.description}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium text-gray-900">
                  {completedVideos} / {videos.length} videos
                </div>
                <div className="text-xs text-gray-500">completados</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Video Player */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Player */}
            {selectedVideo && (
              <PremiumGate
                contentType="course"
                title="Video Premium"
                description="Este video está disponible solo para usuarios Premium."
              >
                <div>
                  <VideoPlayer
                    videoUrl={selectedVideo.videoUrl}
                    videoId={selectedVideo.id}
                    moduleId={moduleId}
                    isPremium={module.isPremium || false}
                    hasAccess={hasAccess}
                    initialProgress={undefined}
                    onProgressUpdate={(progress) => {
                      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/progress/video", selectedVideo.id] });
                    }}
                    onVideoComplete={handleVideoComplete}
                  />
                  
                  {/* Video Info */}
                  <div className="mt-4 bg-white rounded-lg p-4 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedVideo.title}</h2>
                    {selectedVideo.description && (
                      <p className="text-gray-600 text-sm">{selectedVideo.description}</p>
                    )}
                  </div>

                  {/* Next Video Button */}
                  {nextVideo && (
                    <div className="mt-4 bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Siguiente video</p>
                          <p className="text-sm font-medium text-gray-900">{nextVideo.title}</p>
                        </div>
                        <Button
                          onClick={() => setSelectedVideoId(nextVideo.id)}
                          className="bg-brand-orange hover:bg-orange-600 text-white"
                        >
                          Continuar
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </PremiumGate>
            )}
          </div>

          {/* Sidebar - Video List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 sticky top-20">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-5 h-5 text-brand-orange" />
                  <h3 className="font-semibold text-gray-900">Contenido del Curso</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>{videos.length} videos</span>
                    <span>{Math.round(moduleProgressPercentage)}% completado</span>
                  </div>
                  <Progress value={moduleProgressPercentage} className="h-2" />
                </div>
              </div>
              
              <div className="p-4 max-h-[calc(100vh-250px)] overflow-y-auto">
                <div className="space-y-2">
                  {videos.map((video, index) => (
                    <VideoListItem
                      key={video.id}
                      video={video}
                      index={index}
                      isSelected={selectedVideo?.id === video.id}
                      onSelect={() => setSelectedVideoId(video.id)}
                      queryClient={queryClient}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
