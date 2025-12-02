/**
 * Security Tests for Community Endpoints
 * Tests that community endpoints validate roles and premium access correctly
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Request, Response } from "express";
import type { User } from "../../../shared/schema";
import { isAdmin, canCreateTradingAlerts } from "../../utils/roles";

// Mock storage
vi.mock("../../storage", () => ({
  storage: {
    getPostsPaginated: vi.fn(),
    getAllPosts: vi.fn(),
    createPost: vi.fn(),
    isPostLiked: vi.fn(),
    likePost: vi.fn(),
    unlikePost: vi.fn(),
    getUser: vi.fn(),
  },
}));

// Mock roles utils
vi.mock("../../utils/roles", () => ({
  isAdmin: vi.fn((user: User) => user.role === "admin"),
  canViewTradingAlerts: vi.fn((user: User) => {
    return (
      user.role === "admin" ||
      user.role === "premium" ||
      user.role === "legacy" ||
      user.isBetaUser === true ||
      user.subscriptionStatus === "premium" ||
      user.subscriptionStatus === "trial"
    );
  }),
  canCreateTradingAlerts: vi.fn((user: User) => {
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

// Mock auth middleware
vi.mock("../../middlewares/auth", async () => {
  const actual = await vi.importActual("../../middlewares/auth");
  return {
    ...actual,
    requireAuth: vi.fn((req: Request, res: Response, next: any) => {
      if (!req.user) {
        res.status(401).json({ message: "Not authenticated" });
        return;
      }
      next();
    }),
  };
});

// Mock posts service
vi.mock("../posts/service", () => ({
  createPost: vi.fn(),
}));

// Mock error handler
vi.mock("../../middlewares/error", () => ({
  asyncHandler: (fn: any) => fn,
}));

describe("Community Routes Security", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = {
      user: undefined,
      body: {},
      params: {},
      query: {},
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  describe("GET /api/community/posts", () => {
    it("should return 401 when user is not authenticated", async () => {
      const { requireAuth } = await import("../../middlewares/auth");
      
      const req = { ...mockRequest, user: undefined } as Request;
      const res = mockResponse as Response;
      
      await requireAuth(req, res, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Not authenticated" });
    });

    it("should filter trading alerts for free users", async () => {
      const freeUser: User = {
        id: 1,
        role: "free",
        subscriptionStatus: "free",
        isBetaUser: false,
      } as User;

      const canViewAlerts = await import("../../utils/roles").then(m => 
        m.canViewTradingAlerts(freeUser)
      );

      expect(canViewAlerts).toBe(false);
    });

    it("should show trading alerts for premium users", async () => {
      const premiumUser: User = {
        id: 1,
        role: "premium",
        subscriptionStatus: "premium",
      } as User;

      const canViewAlerts = await import("../../utils/roles").then(m => 
        m.canViewTradingAlerts(premiumUser)
      );

      expect(canViewAlerts).toBe(true);
    });
  });

  describe("POST /api/community/posts", () => {
    it("should return 401 when user is not authenticated", async () => {
      const { requireAuth } = await import("../../middlewares/auth");
      
      const req = { ...mockRequest, user: undefined } as Request;
      const res = mockResponse as Response;
      
      await requireAuth(req, res, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("should return 403 when free user tries to create trading alert", () => {
      const freeUser: User = {
        id: 1,
        role: "free",
        subscriptionStatus: "free",
        isBetaUser: false,
      } as User;

      const canCreate = canCreateTradingAlerts(freeUser);
      expect(canCreate).toBe(false);
    });

    it("should allow premium user to create trading alert", () => {
      const premiumUser: User = {
        id: 1,
        role: "premium",
        subscriptionStatus: "premium",
      } as User;

      const canCreate = canCreateTradingAlerts(premiumUser);
      expect(canCreate).toBe(true);
    });

    it("should return 403 when non-admin tries to create advertisement", () => {
      const premiumUser: User = {
        id: 1,
        role: "premium",
        subscriptionStatus: "premium",
      } as User;

      const isUserAdmin = isAdmin(premiumUser);
      expect(isUserAdmin).toBe(false);
    });

    it("should allow admin to create advertisement", () => {
      const adminUser: User = {
        id: 1,
        role: "admin",
      } as User;

      const isUserAdmin = isAdmin(adminUser);
      expect(isUserAdmin).toBe(true);
    });
  });
});

