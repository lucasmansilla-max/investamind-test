import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Home from "./home";

// Mock wouter
vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
}));

// Mock hooks
vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/use-progress", () => ({
  useProgress: () => ({
    completedModules: 2,
    totalModules: 5,
    progressPercentage: 40,
  }),
}));

vi.mock("@/hooks/use-market-data", () => ({
  useMarketData: () => ({
    marketData: [],
    marketNews: [],
    marketIndices: [],
    marketSentiment: "neutral",
  }),
}));

vi.mock("@/hooks/use-gamification", () => ({
  useGamification: () => ({
    userStats: {
      totalPoints: 100,
      lessonsCompleted: 10,
      currentStreak: 5,
    },
    dailyQuote: {
      quote: "Test quote",
      author: "Test author",
    },
    getLevelInfo: () => ({
      name: "Beginner",
      level: 1,
    }),
  }),
}));

vi.mock("@/contexts/language-context", () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

describe("Home", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const renderWithQueryClient = (
    component: React.ReactElement,
    userRole: string = "free"
  ) => {
    const { useAuth } = require("@/hooks/use-auth");
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 1,
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        role: userRole,
      },
      isLoading: false,
      isAuthenticated: true,
    });

    const ReactQuery = require("@tanstack/react-query");
    vi.spyOn(ReactQuery, "useQuery").mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      refetch: vi.fn(),
    } as any);

    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe("Admin button visibility", () => {
    it("should show admin button for admin users", () => {
      renderWithQueryClient(<Home />, "admin");

      // Check for admin button (Shield icon)
      const adminButton = screen.getByTitle("Admin Panel");
      expect(adminButton).toBeInTheDocument();
    });

    it("should not show admin button for free users", () => {
      renderWithQueryClient(<Home />, "free");

      expect(screen.queryByTitle("Admin Panel")).not.toBeInTheDocument();
    });

    it("should not show admin button for premium users", () => {
      renderWithQueryClient(<Home />, "premium");

      expect(screen.queryByTitle("Admin Panel")).not.toBeInTheDocument();
    });

    it("should not show admin button when user is null", () => {
      const { useAuth } = require("@/hooks/use-auth");
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <Home />
        </QueryClientProvider>
      );

      expect(screen.queryByTitle("Admin Panel")).not.toBeInTheDocument();
    });
  });

  describe("User stats display", () => {
    it("should display user stats for all users", () => {
      renderWithQueryClient(<Home />, "free");

      expect(screen.getByText(/40%/i)).toBeInTheDocument();
      expect(screen.getByText(/10/i)).toBeInTheDocument();
      expect(screen.getByText(/5/i)).toBeInTheDocument();
    });

    it("should display streak badge when streak > 0", () => {
      renderWithQueryClient(<Home />, "free");

      expect(screen.getByText(/5.*dayStreak/i)).toBeInTheDocument();
    });
  });

  describe("Navigation buttons", () => {
    it("should show all navigation buttons for all users", () => {
      renderWithQueryClient(<Home />, "free");

      expect(screen.getByText(/continuelearning/i)).toBeInTheDocument();
      expect(screen.getByText(/viewProgress/i)).toBeInTheDocument();
      expect(screen.getByText(/Premium/i)).toBeInTheDocument();
    });
  });
});

