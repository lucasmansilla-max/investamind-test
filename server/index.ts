/**
 * Server entry point
 * Starts HTTP server with Socket.IO integration
 */

import { createServer } from 'http';
import { Server } from 'socket.io';
import { createApp } from './app';
import { registerRoutes } from './routes';
import { setupVite, serveStatic, log } from './vite';
import { errorHandler } from './middlewares/error';
import { env } from './config/env';
import { storage } from './storage';

// Create Express app
const app = createApp();

(async () => {
  // Register API routes
  const server = await registerRoutes(app);

  // Error handler (must be after routes)
  app.use(errorHandler);

  // Setup Socket.IO
  const io = new Server(server, {
    cors: {
      origin: env.CLIENT_ORIGINS,
      credentials: true,
    },
  });

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    log(`Socket.IO: Client connected - ${socket.id}`);

    // Handle user-specific namespace: user:<id>
    socket.on('join:user', async (userId: number) => {
      const room = `user:${userId}`;
      await socket.join(room);
      log(`Socket.IO: User ${userId} joined room ${room}`);
    });

    socket.on('leave:user', async (userId: number) => {
      const room = `user:${userId}`;
      await socket.leave(room);
      log(`Socket.IO: User ${userId} left room ${room}`);
    });

    socket.on('disconnect', () => {
      log(`Socket.IO: Client disconnected - ${socket.id}`);
    });
  });

  // Make io available to routes
  (app as any).io = io;

  // Setup Vite in development, serve static in production
  if (env.NODE_ENV === 'development') {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start server
  server.listen({
    port: env.PORT,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`Server running on port ${env.PORT}`);
    log(`Environment: ${env.NODE_ENV}`);
    log(`CORS origins: ${env.CLIENT_ORIGINS.join(', ')}`);
  });
})();
