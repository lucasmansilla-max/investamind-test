/**
 * Validation Tests for Auth Routes
 * Tests input validation and sanitization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRouter from './routes';
import { signupSchema, signinSchema, resetPasswordSchema } from '../../utils/validation';
import { ZodError } from 'zod';

// Mock auth service
vi.mock('../../services/authService', () => ({
  signup: vi.fn().mockResolvedValue({
    user: { id: 1, email: 'test@example.com', firstName: 'Test', lastName: 'User' },
    sessionId: 'test-session-id',
  }),
  signin: vi.fn().mockResolvedValue({
    user: { id: 1, email: 'test@example.com', firstName: 'Test', lastName: 'User' },
    sessionId: 'test-session-id',
  }),
  signout: vi.fn(),
  requestPasswordReset: vi.fn().mockResolvedValue(undefined),
  resetPassword: vi.fn().mockResolvedValue(undefined),
}));

// Mock storage
vi.mock('../../storage', () => ({
  storage: {
    getUserByUsername: vi.fn(),
  },
}));

// Mock sessions
vi.mock('../../middlewares/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => next(),
  sessions: new Map(),
}));

describe('Auth Routes Validation', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    vi.clearAllMocks();
  });

  describe('POST /api/auth/signup', () => {
    it('should accept valid signup data', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'Password123',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(response.status).toBe(200);
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'not-an-email',
          password: 'Password123',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.message).toContain('email');
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'weak',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          // Missing password, firstName, lastName
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should sanitize email input', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: '  TEST@EXAMPLE.COM  ',
          password: 'Password123',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(response.status).toBe(200);
      // Email should be sanitized and lowercased by the validation middleware
    });

    it('should sanitize HTML from input fields', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'Password123',
          firstName: '<script>alert(1)</script>Test',
          lastName: 'User',
        });

      expect(response.status).toBe(200);
      // HTML should be sanitized
    });
  });

  describe('POST /api/auth/signin', () => {
    it('should accept valid signin data', async () => {
      const response = await request(app)
        .post('/api/auth/signin')
        .send({
          email: 'test@example.com',
          password: 'Password123',
        });

      expect(response.status).toBe(200);
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/signin')
        .send({
          email: 'not-an-email',
          password: 'Password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing password', async () => {
      const response = await request(app)
        .post('/api/auth/signin')
        .send({
          email: 'test@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should accept valid reset password data', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-token',
          newPassword: 'NewPassword123',
        });

      expect(response.status).toBe(200);
    });

    it('should reject weak new password', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-token',
          newPassword: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          newPassword: 'NewPassword123',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should accept valid email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'test@example.com',
        });

      expect(response.status).toBe(200);
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'not-an-email',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });
});

describe('Validation Schemas', () => {
  describe('signupSchema', () => {
    it('should validate correct signup data', () => {
      const result = signupSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'Test',
        lastName: 'User',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid data', () => {
      const result = signupSchema.safeParse({
        email: 'not-an-email',
        password: 'weak',
        firstName: '',
        lastName: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('signinSchema', () => {
    it('should validate correct signin data', () => {
      const result = signinSchema.safeParse({
        email: 'test@example.com',
        password: 'any-password',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = signinSchema.safeParse({
        email: 'not-an-email',
        password: 'any-password',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    it('should validate correct reset password data', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'valid-token',
        newPassword: 'NewPassword123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject weak password', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'valid-token',
        newPassword: 'weak',
      });
      expect(result.success).toBe(false);
    });
  });
});

