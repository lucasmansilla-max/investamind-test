/**
 * Express application setup
 * Configures middleware, routes, and error handlers
 */

import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import pino from "pino";
import { env } from "./config/env";
import { sessionMiddleware } from "./middlewares/session";
import { errorHandler, notFoundHandler } from "./middlewares/error";
import { log } from "./vite";

// Create pino logger
const logger = pino({
  level: env.NODE_ENV === "development" ? "debug" : "info",
});

// Create write rate limiter (60 requests per minute)
const writeRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: "Too many requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

export function createApp() {
  const app = express();

  // Trust proxy - required for rate limiting to work correctly behind Replit's proxy
  app.set("trust proxy", 1);

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === "production" ? undefined : false,
    })
  );

  // CORS configuration
  const allowedOrigins = new Set(env.CLIENT_ORIGINS || []);
  allowedOrigins.add("capacitor://localhost");

  app.use(
    cors({
      origin: (origin, callback) => {
        // allow requests with no origin (e.g., native mobile, curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.has(origin)) return callback(null, true);
        
        // En desarrollo, permitir conexiones desde IPs locales (para dispositivos físicos)
        if (env.NODE_ENV === "development") {
          // Permitir cualquier IP local (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
          const localIPPattern = /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+):\d+$/;
          if (localIPPattern.test(origin)) {
            return callback(null, true);
          }
        }
        
        return callback(new Error("CORS blocked origin: " + origin));
      },
      credentials: true,
    })
  );

  // Body parsing middleware - increased limit for base64 images
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: false, limit: '10mb' }));

  // Cookie parser
  app.use(cookieParser());

  // Session middleware - sets req.user from session cookie
  app.use(sessionMiddleware);

  // Pino HTTP logger with session userId
  app.use(
    pinoHttp({
      logger,
      customProps: (req: any) => ({
        userId: req.cookies?.sessionId
          ? (global as any).__sessions?.get(req.cookies.sessionId)?.userId
          : undefined,
      }),
      serializers: {
        req: (req) => ({
          method: req.method,
          url: req.url,
          userId: (req as any).raw?.userId,
        }),
        res: (res) => ({
          statusCode: res.statusCode,
        }),
      },
    })
  );

  // Apply rate limiting to write operations (POST, PUT, PATCH, DELETE)
  app.use((req, res, next) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      writeRateLimiter(req, res, next);
    } else {
      next();
    }
  });

  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }

        log(logLine);
      }
    });

    next();
  });

  // Health check endpoint
  app.get("/health", (req: Request, res: Response) => {
    res.json({
      status: "ok",
      time: new Date().toISOString(),
    });
  });

  return app;
}
