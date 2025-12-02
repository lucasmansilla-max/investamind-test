import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSubscriptionStatus, useHasPremiumAccess } from "./use-subscription-status";

// Mock apiRequest
vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
}));

describe("useSubscriptionStatus", () => {
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

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("should return subscription status data", async () => {
    const { apiRequest } = require("@/lib/queryClient");
    vi.mocked(apiRequest).mockResolvedValue({
      ok: true,
      json: async () => ({
        role: "premium",
        subscriptionStatus: "premium",
        subscription: {
          id: 1,
          status: "active",
        },
      }),
    });

    const { result } = renderHook(() => useSubscriptionStatus(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data?.role).toBe("premium");
    expect(result.current.data?.subscriptionStatus).toBe("premium");
  });

  it("should return free role on error", async () => {
    const { apiRequest } = require("@/lib/queryClient");
    vi.mocked(apiRequest).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useSubscriptionStatus(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data?.role).toBe("free");
  });
});

describe("useHasPremiumAccess", () => {
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

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe("Premium access by role", () => {
    it("should return true for admin role", async () => {
      const { apiRequest } = require("@/lib/queryClient");
      vi.mocked(apiRequest).mockResolvedValue({
        ok: true,
        json: async () => ({
          role: "admin",
          subscriptionStatus: "free",
        }),
      });

      const { result } = renderHook(() => useHasPremiumAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.hasPremiumAccess).toBe(true);
      });
    });

    it("should return true for premium role", async () => {
      const { apiRequest } = require("@/lib/queryClient");
      vi.mocked(apiRequest).mockResolvedValue({
        ok: true,
        json: async () => ({
          role: "premium",
          subscriptionStatus: "premium",
        }),
      });

      const { result } = renderHook(() => useHasPremiumAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.hasPremiumAccess).toBe(true);
      });
    });

    it("should return true for legacy role", async () => {
      const { apiRequest } = require("@/lib/queryClient");
      vi.mocked(apiRequest).mockResolvedValue({
        ok: true,
        json: async () => ({
          role: "legacy",
          subscriptionStatus: "free",
        }),
      });

      const { result } = renderHook(() => useHasPremiumAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.hasPremiumAccess).toBe(true);
      });
    });

    it("should return false for free role", async () => {
      const { apiRequest } = require("@/lib/queryClient");
      vi.mocked(apiRequest).mockResolvedValue({
        ok: true,
        json: async () => ({
          role: "free",
          subscriptionStatus: "free",
        }),
      });

      const { result } = renderHook(() => useHasPremiumAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.hasPremiumAccess).toBe(false);
      });
    });
  });

  describe("Premium access by subscription status", () => {
    it("should return true for premium subscription status", async () => {
      const { apiRequest } = require("@/lib/queryClient");
      vi.mocked(apiRequest).mockResolvedValue({
        ok: true,
        json: async () => ({
          role: "free",
          subscriptionStatus: "premium",
        }),
      });

      const { result } = renderHook(() => useHasPremiumAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.hasPremiumAccess).toBe(true);
      });
    });

    it("should return true for trial subscription status", async () => {
      const { apiRequest } = require("@/lib/queryClient");
      vi.mocked(apiRequest).mockResolvedValue({
        ok: true,
        json: async () => ({
          role: "free",
          subscriptionStatus: "trial",
        }),
      });

      const { result } = renderHook(() => useHasPremiumAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.hasPremiumAccess).toBe(true);
      });
    });
  });

  describe("Premium access for beta users", () => {
    it("should return true for beta users", async () => {
      const { apiRequest } = require("@/lib/queryClient");
      vi.mocked(apiRequest).mockResolvedValue({
        ok: true,
        json: async () => ({
          role: "free",
          subscriptionStatus: "free",
          isBetaUser: true,
        }),
      });

      const { result } = renderHook(() => useHasPremiumAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.hasPremiumAccess).toBe(true);
      });
    });
  });

  describe("Edge cases", () => {
    it("should return false when subscription data is null", async () => {
      const { apiRequest } = require("@/lib/queryClient");
      vi.mocked(apiRequest).mockResolvedValue({
        ok: true,
        json: async () => null,
      });

      const { result } = renderHook(() => useHasPremiumAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.hasPremiumAccess).toBe(false);
      });
    });

    it("should return false when subscription data is undefined", async () => {
      const { apiRequest } = require("@/lib/queryClient");
      vi.mocked(apiRequest).mockResolvedValue({
        ok: true,
        json: async () => undefined,
      });

      const { result } = renderHook(() => useHasPremiumAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.hasPremiumAccess).toBe(false);
      });
    });
  });
});

