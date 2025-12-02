import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSubscriptionStatus, useHasPremiumAccess } from "./use-subscription-status";

// Mock apiRequest
vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
}));

import { apiRequest } from "@/lib/queryClient";
const mockApiRequest = vi.mocked(apiRequest);

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
    mockApiRequest.mockResolvedValue({
      ok: true,
      json: async () => ({
        role: "premium",
        subscriptionStatus: "premium",
        subscription: {
          id: 1,
          status: "active",
        },
      }),
    } as Response);

    const { result } = renderHook(() => useSubscriptionStatus(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data?.role).toBe("premium");
    expect(result.current.data?.subscriptionStatus).toBe("premium");
  });

  it("should return free role on error", async () => {
    mockApiRequest.mockRejectedValue(new Error("Network error"));

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
      mockApiRequest.mockResolvedValue({
        ok: true,
        json: async () => ({
          role: "admin",
          subscriptionStatus: "free",
        }),
      } as Response);

      const { result } = renderHook(() => useHasPremiumAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.hasPremiumAccess).toBe(true);
      });
    });

    it("should return true for premium role", async () => {
      mockApiRequest.mockResolvedValue({
        ok: true,
        json: async () => ({
          role: "premium",
          subscriptionStatus: "premium",
        }),
      } as Response);

      const { result } = renderHook(() => useHasPremiumAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.hasPremiumAccess).toBe(true);
      });
    });

    it("should return true for legacy role", async () => {
      mockApiRequest.mockResolvedValue({
        ok: true,
        json: async () => ({
          role: "legacy",
          subscriptionStatus: "free",
        }),
      } as Response);

      const { result } = renderHook(() => useHasPremiumAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.hasPremiumAccess).toBe(true);
      });
    });

    it("should return false for free role", async () => {
      mockApiRequest.mockResolvedValue({
        ok: true,
        json: async () => ({
          role: "free",
          subscriptionStatus: "free",
        }),
      } as Response);

      const { result } = renderHook(() => useHasPremiumAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.hasPremiumAccess).toBe(false);
      });
    });
  });

  describe("Premium access by subscription status", () => {
    it("should return true for premium subscription status", async () => {
      mockApiRequest.mockResolvedValue({
        ok: true,
        json: async () => ({
          role: "free",
          subscriptionStatus: "premium",
        }),
      } as Response);

      const { result } = renderHook(() => useHasPremiumAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.hasPremiumAccess).toBe(true);
      });
    });

    it("should return true for trial subscription status", async () => {
      mockApiRequest.mockResolvedValue({
        ok: true,
        json: async () => ({
          role: "free",
          subscriptionStatus: "trial",
        }),
      } as Response);

      const { result } = renderHook(() => useHasPremiumAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.hasPremiumAccess).toBe(true);
      });
    });
  });

  describe("Premium access for beta users", () => {
    it("should return true for beta users", async () => {
      mockApiRequest.mockResolvedValue({
        ok: true,
        json: async () => ({
          role: "free",
          subscriptionStatus: "free",
          isBetaUser: true,
        }),
      } as Response);

      const { result } = renderHook(() => useHasPremiumAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.hasPremiumAccess).toBe(true);
      });
    });
  });

  describe("Edge cases", () => {
    it("should return false when subscription data is null", async () => {
      mockApiRequest.mockResolvedValue({
        ok: true,
        json: async () => null,
      } as Response);

      const { result } = renderHook(() => useHasPremiumAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.hasPremiumAccess).toBe(false);
      });
    });

    it("should return false when subscription data is undefined", async () => {
      // React Query doesn't allow undefined, so we return an empty object instead
      // which is equivalent to undefined in this context
      mockApiRequest.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as Response);

      const { result } = renderHook(() => useHasPremiumAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.hasPremiumAccess).toBe(false);
      });
    });
  });
});

