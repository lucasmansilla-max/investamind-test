import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SubscriptionStatus from "./SubscriptionStatus";

// Mock wouter
vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
}));

// Mock apiRequest
vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: {
    invalidateQueries: vi.fn(),
  },
}));

// Mock useToast
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
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

describe("SubscriptionStatus", () => {
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
    subscriptionData: any = null
  ) => {
    mockUseQuery.mockReturnValue({
      data: subscriptionData,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      refetch: vi.fn(),
    });

    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe("Badge display for subscription status", () => {
    it("should show Active badge for active subscription", () => {
      const activeSubscription = {
        subscriptionStatus: "premium",
        subscription: {
          id: 1,
          status: "active",
          planType: "premium_monthly",
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        role: "premium",
      };

      renderWithQueryClient(<SubscriptionStatus />, activeSubscription);

      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByText("Entitlement Status")).toBeInTheDocument();
    });

    it("should show Expired badge for expired subscription", () => {
      const expiredSubscription = {
        subscriptionStatus: "free",
        subscription: {
          id: 1,
          status: "past_due",
          planType: "premium_monthly",
          currentPeriodEnd: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
        role: "free",
      };

      renderWithQueryClient(<SubscriptionStatus />, expiredSubscription);

      expect(screen.getByText("Expired")).toBeInTheDocument();
    });

    it("should show Free badge for free users", () => {
      const freeUser = {
        subscriptionStatus: "free",
        role: "free",
        subscription: null,
      };

      renderWithQueryClient(<SubscriptionStatus />, freeUser);

      expect(screen.getByText("Free")).toBeInTheDocument();
    });

    it("should show Active badge for beta users", () => {
      const betaUser = {
        subscriptionStatus: "free",
        role: "free",
        isBetaUser: true,
        subscription: null,
      };

      renderWithQueryClient(<SubscriptionStatus />, betaUser);

      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByText("Founder Member")).toBeInTheDocument();
    });
  });

  describe("Subscription state UI", () => {
    it("should display active state UI correctly", () => {
      const activeSubscription = {
        subscriptionStatus: "premium",
        subscription: {
          id: 1,
          status: "active",
          planType: "premium_monthly",
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        role: "premium",
      };

      renderWithQueryClient(<SubscriptionStatus />, activeSubscription);

      expect(screen.getByText("Premium Monthly")).toBeInTheDocument();
      expect(screen.getByText(/Full access to all premium features/i)).toBeInTheDocument();
    });

    it("should display trial state UI correctly", () => {
      const trialSubscription = {
        subscriptionStatus: "trial",
        subscription: {
          id: 1,
          status: "trial",
          planType: "premium_monthly",
          trialEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          currentPeriodEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        role: "free",
      };

      renderWithQueryClient(<SubscriptionStatus />, trialSubscription);

      // When there's a planType, it shows the plan name, not "Free Trial"
      expect(screen.getByText("Premium Monthly")).toBeInTheDocument();
      expect(screen.getByText(/days left in your free trial/i)).toBeInTheDocument();
    });

    it("should display expired state UI correctly", () => {
      const expiredSubscription = {
        subscriptionStatus: "free",
        subscription: {
          id: 1,
          status: "past_due",
          planType: "premium_monthly",
          currentPeriodEnd: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
        role: "free",
      };

      renderWithQueryClient(<SubscriptionStatus />, expiredSubscription);

      expect(screen.getByText("Subscription Expired")).toBeInTheDocument();
      expect(screen.getByText(/Renew Subscription/i)).toBeInTheDocument();
    });

    it("should display free state UI correctly", () => {
      const freeUser = {
        subscriptionStatus: "free",
        role: "free",
        subscription: null,
      };

      renderWithQueryClient(<SubscriptionStatus />, freeUser);

      expect(screen.getByText("Free Plan")).toBeInTheDocument();
      expect(screen.getByText(/Limited access to basic features/i)).toBeInTheDocument();
      expect(screen.getByText(/Start Free Trial/i)).toBeInTheDocument();
    });
  });

  describe("Notifications and alerts", () => {
    it("should show trial expiration warning", () => {
      const trialSubscription = {
        subscriptionStatus: "trial",
        subscription: {
          id: 1,
          status: "trial",
          planType: "premium_monthly",
          trialEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          currentPeriodEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
        role: "free",
      };

      renderWithQueryClient(<SubscriptionStatus />, trialSubscription);

      expect(screen.getByText(/3 days left/i)).toBeInTheDocument();
    });

    it("should show canceled subscription warning", () => {
      const canceledSubscription = {
        subscriptionStatus: "premium",
        subscription: {
          id: 1,
          status: "canceled",
          planType: "premium_monthly",
          currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        },
        role: "premium",
      };

      renderWithQueryClient(<SubscriptionStatus />, canceledSubscription);

      expect(screen.getByText(/Subscription Canceled/i)).toBeInTheDocument();
      expect(screen.getByText(/Access continues until/i)).toBeInTheDocument();
    });
  });
});

