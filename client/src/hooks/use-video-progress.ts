import { useQuery } from "@tanstack/react-query";

export interface VideoProgressSummary {
  totalVideosCompleted: number;
  totalVideosWatched: number;
  totalWatchTime: number;
  averageCompletionRate: number;
}

export function useVideoProgress() {
  const { data, isLoading, error } = useQuery<VideoProgressSummary>({
    queryKey: ["video-progress-summary"],
    queryFn: async () => {
      const response = await fetch("/api/progress/video/summary", {
        credentials: "include",
      });
      
      if (!response.ok) {
        // Return default data if endpoint doesn't exist yet
        return {
          totalVideosCompleted: 0,
          totalVideosWatched: 0,
          totalWatchTime: 0,
          averageCompletionRate: 0,
        };
      }
      
      return response.json();
    },
    retry: false,
  });

  return {
    videoProgress: data || {
      totalVideosCompleted: 0,
      totalVideosWatched: 0,
      totalWatchTime: 0,
      averageCompletionRate: 0,
    },
    isLoading,
    error,
  };
}
