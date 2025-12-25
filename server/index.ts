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

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

(async () => {
  try {
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

    // Start server - use traditional format for better compatibility
    server.listen(env.PORT, "0.0.0.0", () => {
      log(`SERVER UP ON ${env.PORT}`);
      log(`Server running on port ${env.PORT}`);
      log(`Environment: ${env.NODE_ENV}`);
      log(`CORS origins: ${env.CLIENT_ORIGINS.join(', ')}`);
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      const bind = typeof env.PORT === 'string' ? 'Pipe ' + env.PORT : 'Port ' + env.PORT;

      switch (error.code) {
        case 'EACCES':
          console.error(`${bind} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          console.error(`${bind} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();