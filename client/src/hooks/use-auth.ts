import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  selectedLanguage?: string;
  experienceLevel?: string;
  investmentStyle?: string;
  onboardingCompleted?: boolean;
  role?: string;
}

interface AuthResponse {
  user: User;
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: authData, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async (): Promise<AuthResponse> => {
      const response = await fetch("/api/auth/user", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      });

      if (!response.ok) {
        throw new Error("Not authenticated");
      }

      return response.json();
    },
    retry: false,
    staleTime: 0, // Always check for fresh data
    gcTime: 0, // Don't cache in garbage collection
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Evitar refetch cuando se enfoca la ventana
  });
  const user = authData?.user;
  const isAuthenticated = !!user && !error;

  return {
    user,
    isLoading,
    isAuthenticated,
  };
}