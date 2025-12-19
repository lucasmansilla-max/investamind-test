import { useInfiniteQuery } from "@tanstack/react-query";
import { Story } from "@/components/stories/StoryCard";

interface UserStoriesResponse {
  stories: Story[];
  nextCursor: number | null;
}

export function useUserStories(userId: number) {
  return useInfiniteQuery<UserStoriesResponse>({
    queryKey: ["user-stories", userId],
    queryFn: async ({ pageParam = undefined }) => {
      const params = new URLSearchParams();
      if (pageParam) {
        params.append("cursor", String(pageParam));
      }
      params.append("limit", "10");

      const response = await fetch(`/api/stories/user/${userId}?${params}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user stories");
      }

      return response.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
  });
}
