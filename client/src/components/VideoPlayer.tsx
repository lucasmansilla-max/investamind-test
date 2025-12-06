import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Play, Pause, Lock, Settings, Maximize, Volume2, ChevronRight } from "lucide-react";
import { getYouTubeEmbedUrl, isValidYouTubeUrl } from "@/lib/youtubeUtils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface VideoPlayerProps {
  videoUrl: string | null | undefined;
  videoId: number; // ID of the video for progress tracking
  moduleId?: number; // Optional, for backward compatibility
  isPremium?: boolean;
  hasAccess?: boolean;
  onProgressUpdate?: (progress: {
    watchedSeconds: number;
    totalSeconds: number;
    percentage: number;
  }) => void;
  onVideoComplete?: () => void; // Callback when video completes
  initialProgress?: {
    watchedSeconds: number;
    totalSeconds: number | null;
    percentage: number;
  };
}

// YouTube IFrame API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function VideoPlayer({
  videoUrl,
  videoId,
  moduleId,
  isPremium = false,
  hasAccess = true,
  onProgressUpdate,
  onVideoComplete,
  initialProgress,
}: VideoPlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null);
  const youtubePlayerRef = useRef<any>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Load video progress from API - this will automatically refetch when videoId changes
  const { data: savedProgress } = useQuery({
    queryKey: ["/api/progress/video", videoId],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", `/api/progress/video/${videoId}`);
        if (!res.ok) {
          return null;
        }
        const progress = await res.json();
        // Validate that the progress belongs to the current videoId
        if (progress && progress.videoId === videoId) {
          return progress;
        }
        return null;
      } catch (err) {
        console.error("Error fetching video progress:", err);
        return null;
      }
    },
    enabled: !!videoId,
    // Refetch when videoId changes to ensure we get fresh data
    staleTime: 0,
  });

  // Use saved progress or initialProgress - only if it matches current videoId
  // This ensures we never use progress from a different video
  const videoProgress = useMemo(() => {
    // First check savedProgress - must match current videoId
    if (savedProgress && savedProgress.videoId === videoId) {
      return savedProgress;
    }
    // Then check initialProgress - add videoId to it for validation
    if (initialProgress) {
      return { ...initialProgress, videoId };
    }
    return null;
  }, [savedProgress, initialProgress, videoId]);

  // Validate and get embed URL
  const embedUrl = videoUrl && isValidYouTubeUrl(videoUrl) 
    ? getYouTubeEmbedUrl(videoUrl) 
    : null;

  // Reset state when videoId or videoUrl changes
  useEffect(() => {
    // Reset all state when video changes
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setIsLoading(true);
    setError(null);
    
    // Clear any existing intervals immediately
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    // Destroy existing player immediately
    if (youtubePlayerRef.current) {
      try {
        youtubePlayerRef.current.destroy();
      } catch (e) {
        // Ignore errors during cleanup
      }
      youtubePlayerRef.current = null;
    }

    // Clear the player container to force a fresh mount
    if (playerRef.current) {
      playerRef.current.innerHTML = '';
    }
  }, [videoId, videoUrl]);

  // Initialize YouTube IFrame API
  useEffect(() => {
    if (!embedUrl || !hasAccess) {
      setIsLoading(false);
      return;
    }

    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      initializePlayer();
      return;
    }

    // Load YouTube IFrame API
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    if (firstScriptTag && firstScriptTag.parentNode) {
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    // Set up callback for when API is ready
    window.onYouTubeIframeAPIReady = () => {
      initializePlayer();
    };

    return () => {
      // Cleanup
      if (youtubePlayerRef.current) {
        try {
          youtubePlayerRef.current.destroy();
        } catch (e) {
          // Ignore errors during cleanup
        }
        youtubePlayerRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [embedUrl, hasAccess, videoId]);

  const initializePlayer = useCallback(() => {
    if (!playerRef.current || !embedUrl || !hasAccess) {
      return;
    }

    // Don't initialize if we're in the middle of changing videos
    if (!videoId) {
      return;
    }

    const youtubeVideoId = embedUrl.split("/embed/")[1]?.split("?")[0];
    if (!youtubeVideoId) {
      setError("Invalid YouTube video URL");
      setIsLoading(false);
      return;
    }

    // Clear any existing player first
    if (youtubePlayerRef.current) {
      try {
        youtubePlayerRef.current.destroy();
      } catch (e) {
        // Ignore errors
      }
      youtubePlayerRef.current = null;
    }

    // Clear the container
    if (playerRef.current) {
      playerRef.current.innerHTML = '';
    }

    try {
      youtubePlayerRef.current = new window.YT.Player(playerRef.current, {
        videoId: youtubeVideoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          playsinline: 1, // Important for iOS
          enablejsapi: 1,
        },
        events: {
          onReady: (event: any) => {
            setIsLoading(false);
            const player = event.target;
            const totalDuration = player.getDuration();
            
            // Validate duration is valid
            if (!totalDuration || totalDuration <= 0 || !isFinite(totalDuration)) {
              setError("Error obteniendo la duración del video");
              setIsLoading(false);
              return;
            }
            
            setDuration(totalDuration);
            setCurrentTime(0); // Always start at 0, then restore if needed

            // Restore saved progress if available and valid
            // Only restore if the progress belongs to this specific video
            if (videoProgress && 
                videoProgress.videoId === videoId &&
                videoProgress.watchedSeconds && 
                videoProgress.watchedSeconds > 0 &&
                totalDuration > 0) {
              const savedTime = Math.min(Math.max(videoProgress.watchedSeconds, 0), totalDuration);
              if (savedTime > 0 && savedTime < totalDuration) {
                // Use setTimeout to ensure player is fully ready
                setTimeout(() => {
                  try {
                    player.seekTo(savedTime, true);
                    setCurrentTime(savedTime);
                  } catch (err) {
                    console.error("Error seeking to saved time:", err);
                    setCurrentTime(0);
                  }
                }, 100);
              } else {
                setCurrentTime(0);
              }
            } else {
              setCurrentTime(0);
            }

            // Start tracking progress
            startProgressTracking();
          },
          onStateChange: (event: any) => {
            // YT.PlayerState.PLAYING = 1
            // YT.PlayerState.PAUSED = 2
            // YT.PlayerState.ENDED = 3
            const state = event.data;
            setIsPlaying(state === 1);

            if (state === 3) {
              // Video ended
              handleVideoComplete();
            }
          },
          onError: (event: any) => {
            setError("Error loading video. Please try again.");
            setIsLoading(false);
          },
        },
      });
    } catch (err) {
      console.error("Error initializing YouTube player:", err);
      setError("Error initializing video player");
      setIsLoading(false);
    }
  }, [embedUrl, hasAccess, videoProgress]);

  const startProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    // Update progress every 2 seconds for more responsive updates
    progressIntervalRef.current = setInterval(() => {
      if (youtubePlayerRef.current && youtubePlayerRef.current.getCurrentTime) {
        try {
          const current = youtubePlayerRef.current.getCurrentTime();
          const total = youtubePlayerRef.current.getDuration();
          
          // Validate values are valid numbers and total is positive
          if (current !== null && 
              current !== undefined && 
              total !== null && 
              total !== undefined && 
              total > 0 && 
              isFinite(current) && 
              isFinite(total)) {
            
            // Ensure currentTime never exceeds duration
            const validCurrent = Math.min(Math.max(current, 0), total);
            
            // Only update if values are reasonable (prevent showing old video data)
            if (validCurrent <= total && validCurrent >= 0) {
              setCurrentTime(validCurrent);
              
              // Calculate percentage, capped at 100%
              const percentage = Math.min(Math.round((validCurrent / total) * 100), 100);

              // Update parent component
              if (onProgressUpdate) {
                onProgressUpdate({
                  watchedSeconds: Math.round(validCurrent),
                  totalSeconds: Math.round(total),
                  percentage,
                });
              }

              // Auto-save progress to backend every 10 seconds
              if (Math.round(validCurrent) % 10 === 0) {
                saveProgressToBackend(Math.round(validCurrent), Math.round(total), percentage);
              }
            }
          }
        } catch (err) {
          console.error("Error getting video progress:", err);
        }
      }
    }, 2000);
  }, [onProgressUpdate]);

  const saveProgressToBackend = async (
    watchedSeconds: number,
    totalSeconds: number,
    percentage: number
  ) => {
    try {
      // Ensure values are valid
      const validWatchedSeconds = Math.min(Math.max(watchedSeconds, 0), totalSeconds);
      const validPercentage = Math.min(Math.max(percentage, 0), 100);
      
      await apiRequest("POST", "/api/progress/video", {
        videoId,
        watchedSeconds: validWatchedSeconds,
        totalSeconds,
        percentage: validPercentage,
        completed: validPercentage >= 90, // Consider 90% as completed
      });
    } catch (err) {
      console.error("Error saving video progress:", err);
    }
  };

  const handleVideoComplete = async () => {
    if (youtubePlayerRef.current && duration) {
      const percentage = 100;
      setCurrentTime(duration);

      if (onProgressUpdate) {
        onProgressUpdate({
          watchedSeconds: Math.round(duration),
          totalSeconds: Math.round(duration),
          percentage,
        });
      }

      // Save final progress
      await saveProgressToBackend(Math.round(duration), Math.round(duration), percentage);
      
      // Check if all videos in module are completed and mark module as completed
      if (moduleId) {
        try {
          await apiRequest("POST", "/api/progress", {
            moduleId,
            completed: true,
          });
        } catch (err) {
          console.error("Error updating module progress:", err);
        }
      }

      // Call completion callback
      if (onVideoComplete) {
        onVideoComplete();
      }
    }
  };

  const changePlaybackRate = (rate: number) => {
    if (youtubePlayerRef.current) {
      try {
        youtubePlayerRef.current.setPlaybackRate(rate);
        setPlaybackRate(rate);
        toast({
          title: `Velocidad: ${rate}x`,
          duration: 1000,
        });
      } catch (err) {
        console.error("Error changing playback rate:", err);
      }
    }
  };

  const handleSeek = (newTime: number) => {
    if (youtubePlayerRef.current && duration > 0) {
      const seekTime = Math.min(Math.max(newTime, 0), duration);
      try {
        youtubePlayerRef.current.seekTo(seekTime, true);
        setCurrentTime(seekTime);
      } catch (err) {
        console.error("Error seeking:", err);
      }
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    handleSeek(newTime);
  };

  const handleProgressBarHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const hoverTime = Math.min(Math.max(percent * duration, 0), duration);
    setHoverTime(hoverTime);
  };

  const toggleFullscreen = () => {
    if (!playerRef.current) return;
    const container = playerRef.current.closest('.video-player-container');
    if (container) {
      if (!document.fullscreenElement) {
        container.requestFullscreen?.().catch((err) => {
          console.error("Error entering fullscreen:", err);
        });
      } else {
        document.exitFullscreen?.().catch((err) => {
          console.error("Error exiting fullscreen:", err);
        });
      }
    }
  };

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const togglePlayPause = () => {
    if (!youtubePlayerRef.current) return;

    try {
      if (isPlaying) {
        youtubePlayerRef.current.pauseVideo();
      } else {
        youtubePlayerRef.current.playVideo();
      }
    } catch (err) {
      console.error("Error toggling play/pause:", err);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate progress percentage, ensuring it never exceeds 100%
  // Only calculate if we have valid duration and currentTime values
  const progressPercentage = useMemo(() => {
    if (duration > 0 && 
        isFinite(duration) && 
        currentTime >= 0 && 
        currentTime <= duration && 
        isFinite(currentTime)) {
      return Math.min(Math.max((currentTime / duration) * 100, 0), 100);
    }
    return 0;
  }, [currentTime, duration]);

  if (!videoUrl) {
    return null;
  }

  if (!isValidYouTubeUrl(videoUrl)) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <p className="text-red-600">Invalid YouTube URL format</p>
        </CardContent>
      </Card>
    );
  }

  if (!hasAccess && isPremium) {
    return (
      <Card className="mb-4 border-2 border-dashed border-brand-light-green bg-brand-light-green/20">
        <CardContent className="p-6 text-center">
          <Lock className="w-12 h-12 mx-auto mb-4 text-brand-orange" />
          <h3 className="text-lg font-bold text-brand-dark-green mb-2">
            Video Premium
          </h3>
          <p className="text-brand-dark-green/70 mb-4">
            Este video está disponible solo para usuarios Premium. 
            Actualiza tu plan para acceder a todo el contenido.
          </p>
          <Button
            onClick={() => {
              window.location.href = "/pricing";
            }}
            className="bg-brand-orange hover:bg-orange-600 text-white"
          >
            Actualizar a Premium
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="video-player-container mb-4 bg-black rounded-lg overflow-hidden shadow-lg">
      <Card className="border-0 shadow-none">
        <CardContent className="p-0">
          {/* YouTube Player Container - key forces remount when videoId changes */}
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }} key={`player-${videoId}`}> {/* 16:9 aspect ratio */}
          <div
            ref={playerRef}
            className="absolute top-0 left-0 w-full h-full"
            style={{ minHeight: "200px" }}
            key={`player-container-${videoId}`}
          />
          
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-brand-orange border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-gray-600">Cargando video...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center p-4">
                <p className="text-red-600 mb-2">{error}</p>
                <Button
                  onClick={() => {
                    setError(null);
                    setIsLoading(true);
                    initializePlayer();
                  }}
                  variant="outline"
                  size="sm"
                >
                  Reintentar
                </Button>
              </div>
            </div>
          )}
          </div>

          {/* Advanced Controls - only show if duration is valid */}
        {duration > 0 && isFinite(duration) && currentTime >= 0 && currentTime <= duration && (
          <div 
            className="bg-gray-900 text-white p-4 space-y-3"
            onMouseMove={resetControlsTimeout}
            onMouseLeave={() => {
              if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
              }
              if (isPlaying) {
                controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 2000);
              }
            }}
          >
            {/* Progress Bar */}
            <div 
              ref={progressBarRef}
              className="relative w-full h-2 bg-gray-700 rounded-full cursor-pointer group"
              onClick={handleProgressBarClick}
              onMouseMove={handleProgressBarHover}
              onMouseLeave={() => setHoverTime(null)}
            >
              <div 
                className="absolute h-full bg-brand-orange rounded-full transition-all"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
              {hoverTime !== null && (
                <div 
                  className="absolute top-0 h-full w-1 bg-white opacity-50"
                  style={{ left: `${(hoverTime / duration) * 100}%` }}
                />
              )}
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-brand-orange rounded-full border-2 border-white shadow-lg transition-all opacity-0 group-hover:opacity-100"
                style={{ left: `calc(${Math.min(progressPercentage, 100)}% - 8px)` }}
              />
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={togglePlayPause}
                  disabled={isLoading || !!error}
                  className="text-white hover:bg-gray-800"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </Button>
                
                <div className="flex items-center space-x-2 text-sm">
                  <span>{formatTime(Math.min(currentTime, duration))}</span>
                  <span className="text-gray-400">/</span>
                  <span>{formatTime(duration)}</span>
                </div>

                <div className="flex items-center space-x-1 ml-4">
                  <Volume2 className="w-4 h-4 text-gray-400" />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Playback Speed */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-gray-800 text-sm"
                    >
                      {playbackRate}x
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <DropdownMenuItem
                        key={rate}
                        onClick={() => changePlaybackRate(rate)}
                        className={playbackRate === rate ? "bg-gray-100" : ""}
                      >
                        {rate}x {playbackRate === rate && "✓"}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Settings */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-gray-800"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Calidad</DropdownMenuItem>
                    <DropdownMenuItem>Subtítulos</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Configuración</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Fullscreen */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="text-white hover:bg-gray-800"
                >
                  <Maximize className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Progress Percentage */}
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{Math.round(Math.min(progressPercentage, 100))}% completado</span>
              {hoverTime !== null && (
                <span className="text-white">
                  {formatTime(hoverTime)}
                </span>
              )}
            </div>
          </div>
        )}
        </CardContent>
      </Card>
    </div>
  );
}

