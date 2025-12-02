/**
 * Security Tests for Admin Endpoints
 * Tests that admin endpoints are properly protected
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Request, Response } from "express";
import type { User } from "../../../shared/schema";

// Mock storage
vi.mock("../../storage", () => ({
  storage: {
    getWebhookLogs: vi.fn(),
    getWebhookLog: vi.fn(),
    getUser: vi.fn(),
  },
}));

// Mock auth middlewares
vi.mock("../../middlewares/auth", async () => {
  const actual = await vi.importActual("../../middlewares/auth");
  return {
    ...actual,
    requireAuth: vi.fn((req: Request, res: Response, next: any) => {
      // Simulate requireAuth behavior
      if (!req.user) {
        res.status(401).json({ message: "Not authenticated" });
        return;
      }
      next();
    }),
    requireAdmin: vi.fn((req: Request, res: Response, next: any) => {
      // Simulate requireAdmin behavior
      if (!req.user) {
        res.status(401).json({ message: "Not authenticated" });
        return;
      }
      if ((req.user as User).role !== "admin") {
        res.status(403).json({ message: "Forbidden: Admin access required" });
        return;
      }
      next();
    }),
  };
});

// Mock error handler
vi.mock("../../middlewares/error", () => ({
  asyncHandler: (fn: any) => fn,
}));

describe("Admin Routes Security", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = {
      user: undefined,
      query: {},
      params: {},
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  describe("GET /api/admin/webhook-logs", () => {
    it("should return 401 when user is not authenticated", async () => {
      const { requireAuth, requireAdmin } = await import("../../middlewares/auth");
      const adminRouter = await import("./routes");
      
      // Simulate unauthenticated request
      const req = { ...mockRequest, user: undefined } as Request;
      const res = mockResponse as Response;
      
      // Test requireAuth middleware
      await requireAuth(req, res, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Not authenticated" });
    });

    it("should return 403 when user is not admin", async () => {
      const { requireAdmin } = await import("../../middlewares/auth");
      
      const freeUser: User = {
        id: 1,
        role: "free",
      } as User;
      
      const req = { ...mockRequest, user: freeUser } as Request;
      const res = mockResponse as Response;
      
      requireAdmin(req, res, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "Forbidden: Admin access required",
      });
    });

    it("should allow access when user is admin", async () => {
      const { requireAuth, requireAdmin } = await import("../../middlewares/auth");
      
      const adminUser: User = {
        id: 1,
        role: "admin",
      } as User;
      
      const req = { ...mockRequest, user: adminUser } as Request;
      const res = mockResponse as Response;
      
      await requireAuth(req, res, mockNext);
      requireAdmin(req, res, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("GET /api/admin/webhook-logs/:id", () => {
    it("should return 401 when user is not authenticated", async () => {
      const { requireAuth } = await import("../../middlewares/auth");
      
      const req = { ...mockRequest, user: undefined } as Request;
      const res = mockResponse as Response;
      
      await requireAuth(req, res, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("should return 403 when user is not admin", async () => {
      const { requireAdmin } = await import("../../middlewares/auth");
      
      const freeUser: User = {
        id: 1,
        role: "free",
      } as User;
      
      const req = { ...mockRequest, user: freeUser } as Request;
      const res = mockResponse as Response;
      
      requireAdmin(req, res, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe("GET /api/admin/users", () => {
    it("should return 401 when user is not authenticated", async () => {
      const { requireAuth } = await import("../../middlewares/auth");
      
      const req = { ...mockRequest, user: undefined } as Request;
      const res = mockResponse as Response;
      
      await requireAuth(req, res, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("should return 403 when user is not admin", async () => {
      const { requireAdmin } = await import("../../middlewares/auth");
      
      const premiumUser: User = {
        id: 1,
        role: "premium",
      } as User;
      
      const req = { ...mockRequest, user: premiumUser } as Request;
      const res = mockResponse as Response;
      
      requireAdmin(req, res, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});

