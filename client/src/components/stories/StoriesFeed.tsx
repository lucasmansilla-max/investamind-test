import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, PlayCircle, Plus } from "lucide-react";
import { Story } from "./StoryCard";
import StoryThumbnail from "./StoryThumbnail";
import StoryDetailModal from "./StoryDetailModal";
import StoryCreationModal from "./StoryCreationModal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/language-context";

interface StoriesFeedResponse {
  stories: Story[];
  nextCursor: number | null;
}

export default function StoriesFeed() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const { t } = useLanguage();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery<StoriesFeedResponse>({
    queryKey: ["stories"],
    queryFn: async ({ pageParam = undefined }) => {
      const params = new URLSearchParams();
      if (pageParam) {
        params.append("cursor", String(pageParam));
      }
      params.append("limit", "20");

      const response = await fetch(`/api/stories/feed?${params}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.message || "Failed to fetch stories");
        } catch {
          throw new Error("Failed to fetch stories");
        }
      }

      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        console.error("Invalid JSON response:", text);
        return { stories: [], nextCursor: null };
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
  });

  const allStories = data?.pages.flatMap((page) => page.stories) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-brand-dark-green" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load stories. Please try again."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stories list */}
      {allStories.length === 0 ? (
        <div className="text-center py-12">
          <div className="mb-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <PlayCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('stories.noStoriesTitle')}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {t('stories.noStoriesDescription')}
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('stories.createFirstStory')}
          </Button>
        </div>
      ) : (
        <>
          {/* Grid layout for stories */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {allStories.map((story) => (
              <StoryThumbnail
                key={story.id}
                story={story}
                onClick={() => {
                  setSelectedStory(story);
                  setIsDetailModalOpen(true);
                }}
              />
            ))}
          </div>

          {/* Load more button */}
          {hasNextPage && (
            <div className="flex justify-center pt-6">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Creation modal */}
      <StoryCreationModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
      
      {/* Story detail modal */}
      <StoryDetailModal
        story={selectedStory}
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
      />
    </div>
  );
}
