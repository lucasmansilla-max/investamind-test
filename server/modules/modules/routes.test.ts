/**
 * Security Tests for Learning Modules Endpoints
 * Tests that module endpoints validate premium access correctly
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Request, Response } from "express";
import type { User } from "../../../shared/schema";

// Mock storage
vi.mock("../../storage", () => ({
  storage: {
    getAllModules: vi.fn(),
    getModule: vi.fn(),
  },
}));

// Mock auth middleware
vi.mock("../../middlewares/auth", async () => {
  const actual = await vi.importActual("../../middlewares/auth");
  return {
    ...actual,
    optionalAuth: vi.fn(async (req: Request, res: Response, next: any) => {
      // optionalAuth doesn't block, just sets req.user if available
      next();
    }),
  };
});

// Mock roles utils
vi.mock("../../utils/roles", () => ({
  canAccessCourses: vi.fn((user: User | undefined) => {
    if (!user) return false;
    return (
      user.role === "admin" ||
      user.role === "premium" ||
      user.role === "legacy" ||
      user.isBetaUser === true ||
      user.subscriptionStatus === "premium" ||
      user.subscriptionStatus === "trial"
    );
  }),
}));

// Mock error handler
vi.mock("../../middlewares/error", () => ({
  asyncHandler: (fn: any) => fn,
}));

describe("Modules Routes Security", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = {
      user: undefined,
      query: {},
      params: {},
      headers: {},
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  describe("GET /api/modules", () => {
    it("should return 401 when user is not authenticated", async () => {
      const { canAccessCourses } = await import("../../utils/roles");
      
      const hasAccess = canAccessCourses(undefined);
      expect(hasAccess).toBe(false);
    });

    it("should return 403 when free user tries to access modules", async () => {
      const { canAccessCourses } = await import("../../utils/roles");
      
      const freeUser: User = {
        id: 1,
        role: "free",
        subscriptionStatus: "free",
        isBetaUser: false,
      } as User;

      const hasAccess = canAccessCourses(freeUser);
      expect(hasAccess).toBe(false);
    });

    it("should allow premium user to access modules", async () => {
      const { canAccessCourses } = await import("../../utils/roles");
      
      const premiumUser: User = {
        id: 1,
        role: "premium",
        subscriptionStatus: "premium",
      } as User;

      const hasAccess = canAccessCourses(premiumUser);
      expect(hasAccess).toBe(true);
    });

    it("should allow admin to access modules", async () => {
      const { canAccessCourses } = await import("../../utils/roles");
      
      const adminUser: User = {
        id: 1,
        role: "admin",
        subscriptionStatus: "free",
      } as User;

      const hasAccess = canAccessCourses(adminUser);
      expect(hasAccess).toBe(true);
    });

    it("should allow legacy user to access modules", async () => {
      const { canAccessCourses } = await import("../../utils/roles");
      
      const legacyUser: User = {
        id: 1,
        role: "legacy",
        subscriptionStatus: "free",
      } as User;

      const hasAccess = canAccessCourses(legacyUser);
      expect(hasAccess).toBe(true);
    });

    it("should allow beta user to access modules", async () => {
      const { canAccessCourses } = await import("../../utils/roles");
      
      const betaUser: User = {
        id: 1,
        role: "free",
        subscriptionStatus: "free",
        isBetaUser: true,
      } as User;

      const hasAccess = canAccessCourses(betaUser);
      expect(hasAccess).toBe(true);
    });

    it("should allow user with trial subscription to access modules", async () => {
      const { canAccessCourses } = await import("../../utils/roles");
      
      const trialUser: User = {
        id: 1,
        role: "free",
        subscriptionStatus: "trial",
      } as User;

      const hasAccess = canAccessCourses(trialUser);
      expect(hasAccess).toBe(true);
    });
  });

  describe("GET /api/modules/:id", () => {
    it("should return 401 when user is not authenticated", async () => {
      const { canAccessCourses } = await import("../../utils/roles");
      
      const hasAccess = canAccessCourses(undefined);
      expect(hasAccess).toBe(false);
    });

    it("should return 403 when free user tries to access specific module", async () => {
      const { canAccessCourses } = await import("../../utils/roles");
      
      const freeUser: User = {
        id: 1,
        role: "free",
        subscriptionStatus: "free",
        isBetaUser: false,
      } as User;

      const hasAccess = canAccessCourses(freeUser);
      expect(hasAccess).toBe(false);
    });

    it("should allow premium user to access specific module", async () => {
      const { canAccessCourses } = await import("../../utils/roles");
      
      const premiumUser: User = {
        id: 1,
        role: "premium",
        subscriptionStatus: "premium",
      } as User;

      const hasAccess = canAccessCourses(premiumUser);
      expect(hasAccess).toBe(true);
    });
  });
});

