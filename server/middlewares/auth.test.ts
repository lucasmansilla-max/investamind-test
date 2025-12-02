/**
 * Security Tests for Authentication Middlewares
 * Tests authentication, authorization, and role-based access control
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import {
  requireAuth,
  requireAdmin,
  requirePremium,
  requireTradingAlerts,
  requireViewTradingAlerts,
  requireCourses,
  getSession,
} from "./auth";
import { storage } from "../storage";
import type { User } from "../../shared/schema";

// Mock storage
vi.mock("../storage", () => ({
  storage: {
    getUser: vi.fn(),
  },
}));

// Mock sessions
const mockSessions = new Map<string, { userId: number; email: string }>();
(global as any).__sessions = mockSessions;

describe("Authentication Middlewares", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessions.clear();

    mockRequest = {
      cookies: {},
      user: undefined,
      session: undefined,
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  describe("getSession", () => {
    it("should return null when no session cookie", () => {
      const session = getSession(mockRequest as Request);
      expect(session).toBeNull();
    });

    it("should return null when session does not exist", () => {
      mockRequest.cookies = { sessionId: "invalid-session" };
      const session = getSession(mockRequest as Request);
      expect(session).toBeNull();
    });

    it("should return session when valid", () => {
      const sessionData = { userId: 1, email: "test@example.com" };
      mockSessions.set("valid-session", sessionData);
      mockRequest.cookies = { sessionId: "valid-session" };
      
      const session = getSession(mockRequest as Request);
      expect(session).toEqual(sessionData);
    });
  });

  describe("requireAuth", () => {
    it("should return 401 when no session cookie", async () => {
      await requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Not authenticated",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 401 when session does not exist", async () => {
      mockRequest.cookies = { sessionId: "invalid-session" };

      await requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Invalid session",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 404 when user does not exist", async () => {
      const sessionData = { userId: 1, email: "test@example.com" };
      mockSessions.set("valid-session", sessionData);
      mockRequest.cookies = { sessionId: "valid-session" };
      
      vi.mocked(storage.getUser).mockResolvedValue(undefined);

      await requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "User not found",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should set req.user and call next when authenticated", async () => {
      const sessionData = { userId: 1, email: "test@example.com" };
      mockSessions.set("valid-session", sessionData);
      mockRequest.cookies = { sessionId: "valid-session" };
      
      const mockUser: User = {
        id: 1,
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        role: "free",
        subscriptionStatus: "free",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;

      vi.mocked(storage.getUser).mockResolvedValue(mockUser);

      await requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toEqual(mockUser);
      expect(mockRequest.session).toEqual(sessionData);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe("requireAdmin", () => {
    it("should return 401 when user is not authenticated", () => {
      requireAdmin(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Not authenticated",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 403 when user is not admin", () => {
      mockRequest.user = {
        id: 1,
        role: "free",
      } as User;

      requireAdmin(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Forbidden: Admin access required",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should call next when user is admin", () => {
      mockRequest.user = {
        id: 1,
        role: "admin",
      } as User;

      requireAdmin(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe("requirePremium", () => {
    it("should return 401 when user is not authenticated", () => {
      requirePremium(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Not authenticated",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 403 when user does not have premium access", () => {
      mockRequest.user = {
        id: 1,
        role: "free",
        subscriptionStatus: "free",
        isBetaUser: false,
      } as User;

      requirePremium(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Premium subscription required",
        requiresUpgrade: true,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should call next when user has premium role", () => {
      mockRequest.user = {
        id: 1,
        role: "premium",
        subscriptionStatus: "premium",
      } as User;

      requirePremium(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it("should call next when user has legacy role", () => {
      mockRequest.user = {
        id: 1,
        role: "legacy",
        subscriptionStatus: "free",
      } as User;

      requirePremium(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it("should call next when user is admin", () => {
      mockRequest.user = {
        id: 1,
        role: "admin",
        subscriptionStatus: "free",
      } as User;

      requirePremium(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it("should call next when user has premium subscription status", () => {
      mockRequest.user = {
        id: 1,
        role: "free",
        subscriptionStatus: "premium",
      } as User;

      requirePremium(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it("should call next when user is beta user", () => {
      mockRequest.user = {
        id: 1,
        role: "free",
        subscriptionStatus: "free",
        isBetaUser: true,
      } as User;

      requirePremium(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe("requireTradingAlerts", () => {
    it("should return 401 when user is not authenticated", () => {
      requireTradingAlerts(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Not authenticated",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 403 when user cannot create trading alerts", () => {
      mockRequest.user = {
        id: 1,
        role: "free",
        subscriptionStatus: "free",
        isBetaUser: false,
      } as User;

      requireTradingAlerts(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Premium subscription required to create trading alerts",
        requiresUpgrade: true,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should call next when user can create trading alerts", () => {
      mockRequest.user = {
        id: 1,
        role: "premium",
        subscriptionStatus: "premium",
      } as User;

      requireTradingAlerts(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe("requireViewTradingAlerts", () => {
    it("should return 401 when user is not authenticated", () => {
      requireViewTradingAlerts(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Not authenticated",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 403 when user cannot view trading alerts", () => {
      mockRequest.user = {
        id: 1,
        role: "free",
        subscriptionStatus: "free",
        isBetaUser: false,
      } as User;

      requireViewTradingAlerts(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Premium subscription required to view trading alerts",
        requiresUpgrade: true,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should call next when user can view trading alerts", () => {
      mockRequest.user = {
        id: 1,
        role: "premium",
        subscriptionStatus: "premium",
      } as User;

      requireViewTradingAlerts(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe("requireCourses", () => {
    it("should return 401 when user is not authenticated", () => {
      requireCourses(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Not authenticated",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 403 when user cannot access courses", () => {
      mockRequest.user = {
        id: 1,
        role: "free",
        subscriptionStatus: "free",
        isBetaUser: false,
      } as User;

      requireCourses(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Premium subscription required to access courses",
        requiresUpgrade: true,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should call next when user can access courses", () => {
      mockRequest.user = {
        id: 1,
        role: "premium",
        subscriptionStatus: "premium",
      } as User;

      requireCourses(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});

