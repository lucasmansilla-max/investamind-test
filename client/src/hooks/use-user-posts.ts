import { useQuery } from "@tanstack/react-query";

export interface UserPost {
  id: number;
  content: string;
  postType: string;
  messageType: string | null;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

export function useUserPosts(userId: number) {
  return useQuery<UserPost[]>({
    queryKey: ["user-posts", userId],
    queryFn: async () => {
      const response = await fetch(`/api/posts/feed/global?userId=${userId}&limit=10`, {
        credentials: "include",
      });

      if (!response.ok) {
        // Return empty array if endpoint fails
        return [];
      }

      const data = await response.json();
      return data.posts || [];
    },
    retry: false,
  });
}
