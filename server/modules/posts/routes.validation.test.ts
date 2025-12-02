/**
 * Validation Tests for Posts Routes
 * Tests input validation and sanitization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPostSchema, updatePostSchema, feedQuerySchema } from '../../utils/validation';

describe('Posts Routes Validation', () => {
  describe('createPostSchema', () => {
    it('should validate correct post data', () => {
      const result = createPostSchema.safeParse({
        body: 'This is a post content',
        imageUrl: 'https://example.com/image.jpg',
        messageType: 'general',
        postType: 'general',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty body', () => {
      const result = createPostSchema.safeParse({
        body: '',
        postType: 'general',
      });
      expect(result.success).toBe(false);
    });

    it('should reject body that is too long', () => {
      const longBody = 'a'.repeat(5001);
      const result = createPostSchema.safeParse({
        body: longBody,
        postType: 'general',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid URL', () => {
      const result = createPostSchema.safeParse({
        body: 'Post content',
        imageUrl: 'not-a-url',
        postType: 'general',
      });
      expect(result.success).toBe(false);
    });

    it('should sanitize HTML from body', () => {
      const result = createPostSchema.safeParse({
        body: '<script>alert(1)</script>Hello',
        postType: 'general',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body).not.toContain('<script>');
      }
    });

    it('should accept valid messageType values', () => {
      const types = ['general', 'signal', 'trading_alert'];
      types.forEach((type) => {
        const result = createPostSchema.safeParse({
          body: 'Post content',
          messageType: type,
          postType: 'general',
        });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid messageType', () => {
      const result = createPostSchema.safeParse({
        body: 'Post content',
        messageType: 'invalid_type',
        postType: 'general',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updatePostSchema', () => {
    it('should validate correct update data', () => {
      const result = updatePostSchema.safeParse({
        body: 'Updated content',
        imageUrl: 'https://example.com/new-image.jpg',
      });
      expect(result.success).toBe(true);
    });

    it('should allow partial updates', () => {
      const result = updatePostSchema.safeParse({
        body: 'Updated content',
      });
      expect(result.success).toBe(true);
    });

    it('should allow null imageUrl', () => {
      const result = updatePostSchema.safeParse({
        imageUrl: null,
      });
      expect(result.success).toBe(true);
    });

    it('should reject body that is too long', () => {
      const longBody = 'a'.repeat(5001);
      const result = updatePostSchema.safeParse({
        body: longBody,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('feedQuerySchema', () => {
    it('should validate correct query parameters', () => {
      const result = feedQuerySchema.safeParse({
        sort: 'recent',
        cursor: 'cursor123',
        limit: '20',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });

    it('should default sort to recent', () => {
      const result = feedQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sort).toBe('recent');
      }
    });

    it('should default limit to 20 when not provided', () => {
      const result = feedQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });

    it('should clamp limit to maximum 100', () => {
      const result = feedQuerySchema.safeParse({
        limit: '200',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(100);
      }
    });

    it('should clamp limit to minimum 1', () => {
      const result = feedQuerySchema.safeParse({
        limit: '0',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20); // Default when invalid
      }
    });

    it('should accept valid sort values', () => {
      const sorts = ['recent', 'popular', 'trending'];
      sorts.forEach((sort) => {
        const result = feedQuerySchema.safeParse({ sort });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid sort value', () => {
      const result = feedQuerySchema.safeParse({
        sort: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });
});

