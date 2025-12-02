import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Home from "./home";

// Mock wouter
vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
}));

// Mock hooks
const mockUseAuth = vi.fn();
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
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

// Mock useQuery
const mockUseQuery = vi.fn();
vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useQuery: (options: any) => mockUseQuery(options),
  };
});

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
    mockUseAuth.mockReturnValue({
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

    // Mock useQuery to return different data based on queryKey
    mockUseQuery.mockImplementation((options: any) => {
      const queryKey = options?.queryKey?.[0];
      if (queryKey === "/api/modules") {
        return {
          data: [],
          isLoading: false,
          error: null,
          isError: false,
          isSuccess: true,
          refetch: vi.fn(),
        };
      }
      if (queryKey === "/api/market-recaps") {
        return {
          data: [],
          isLoading: false,
          error: null,
          isError: false,
          isSuccess: true,
          refetch: vi.fn(),
        };
      }
      // Default return
      return {
        data: [],
        isLoading: false,
        error: null,
        isError: false,
        isSuccess: true,
        refetch: vi.fn(),
      };
    });

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
      mockUseAuth.mockReturnValue({
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
      // Verify user stats are displayed - there may be multiple instances of these numbers
      // so we verify they exist rather than using getByText which requires a unique match
      expect(screen.getByText("100")).toBeInTheDocument(); // totalPoints
      expect(screen.getAllByText("10").length).toBeGreaterThan(0); // lessonsCompleted
      expect(screen.getAllByText("5").length).toBeGreaterThan(0); // currentStreak
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
      // There are multiple "Premium" texts on the page, so we use getAllByText
      // and verify that at least one exists (the navigation button)
      const premiumElements = screen.getAllByText(/Premium/i);
      expect(premiumElements.length).toBeGreaterThan(0);
    });
  });
});

