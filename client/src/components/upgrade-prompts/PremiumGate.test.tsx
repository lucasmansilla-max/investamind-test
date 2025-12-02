import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PremiumGate from "./PremiumGate";
import * as ReactQuery from "@tanstack/react-query";

// Mock wouter
vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
}));

// Mock apiRequest
vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({}),
  }),
}));

describe("PremiumGate", () => {
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
    subscriptionData: any = { role: "free" }
  ) => {
    vi.spyOn(ReactQuery, "useQuery").mockReturnValue({
      data: subscriptionData,
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

  describe("Access control by role", () => {
    it("should allow access for admin role", () => {
      renderWithQueryClient(
        <PremiumGate>
          <div>Premium Content</div>
        </PremiumGate>,
        { role: "admin" }
      );

      expect(screen.getByText("Premium Content")).toBeInTheDocument();
      expect(screen.queryByText("Upgrade to Premium")).not.toBeInTheDocument();
    });

    it("should allow access for premium role", () => {
      renderWithQueryClient(
        <PremiumGate>
          <div>Premium Content</div>
        </PremiumGate>,
        { role: "premium" }
      );

      expect(screen.getByText("Premium Content")).toBeInTheDocument();
    });

    it("should allow access for legacy role", () => {
      renderWithQueryClient(
        <PremiumGate>
          <div>Premium Content</div>
        </PremiumGate>,
        { role: "legacy" }
      );

      expect(screen.getByText("Premium Content")).toBeInTheDocument();
    });

    it("should block access for free role", () => {
      renderWithQueryClient(
        <PremiumGate>
          <div>Premium Content</div>
        </PremiumGate>,
        { role: "free" }
      );

      expect(screen.queryByText("Premium Content")).not.toBeInTheDocument();
      expect(screen.getByText("Upgrade to Premium")).toBeInTheDocument();
    });

    it("should allow access for beta users", () => {
      renderWithQueryClient(
        <PremiumGate>
          <div>Premium Content</div>
        </PremiumGate>,
        { role: "free", isBetaUser: true }
      );

      expect(screen.getByText("Premium Content")).toBeInTheDocument();
    });

    it("should allow access for premium subscription status", () => {
      renderWithQueryClient(
        <PremiumGate>
          <div>Premium Content</div>
        </PremiumGate>,
        { role: "free", subscriptionStatus: "premium" }
      );

      expect(screen.getByText("Premium Content")).toBeInTheDocument();
    });

    it("should allow access for trial subscription status", () => {
      renderWithQueryClient(
        <PremiumGate>
          <div>Premium Content</div>
        </PremiumGate>,
        { role: "free", subscriptionStatus: "trial" }
      );

      expect(screen.getByText("Premium Content")).toBeInTheDocument();
    });
  });

  describe("Content type access", () => {
    it("should allow access to basic_module_1 for free users", () => {
      renderWithQueryClient(
        <PremiumGate contentType="basic_module_1">
          <div>Basic Module Content</div>
        </PremiumGate>,
        { role: "free" }
      );

      expect(screen.getByText("Basic Module Content")).toBeInTheDocument();
    });

    it("should allow access to community_read for free users", () => {
      renderWithQueryClient(
        <PremiumGate contentType="community_read">
          <div>Community Content</div>
        </PremiumGate>,
        { role: "free" }
      );

      expect(screen.getByText("Community Content")).toBeInTheDocument();
    });
  });

  describe("Upgrade prompt display", () => {
    it("should show upgrade prompt with default title", () => {
      renderWithQueryClient(
        <PremiumGate>
          <div>Premium Content</div>
        </PremiumGate>,
        { role: "free" }
      );

      expect(screen.queryByText("Premium Content")).not.toBeInTheDocument();
      expect(screen.getByText("Upgrade to Premium")).toBeInTheDocument();
    });

    it("should show custom title and description", () => {
      renderWithQueryClient(
        <PremiumGate
          title="Custom Title"
          description="Custom description"
        >
          <div>Premium Content</div>
        </PremiumGate>,
        { role: "free" }
      );

      expect(screen.getByText("Custom Title")).toBeInTheDocument();
      expect(screen.getByText("Custom description")).toBeInTheDocument();
    });

    it("should show trial message when no subscription exists", () => {
      renderWithQueryClient(
        <PremiumGate>
          <div>Premium Content</div>
        </PremiumGate>,
        { role: "free", subscription: null }
      );

      expect(
        screen.getByText(/Start with a 7-day free trial/i)
      ).toBeInTheDocument();
    });
  });
});

