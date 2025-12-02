/**
 * Tests for validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeString,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeUsername,
  sanitizeTextContent,
  formatValidationErrors,
  emailSchema,
  passwordSchema,
  usernameSchema,
  postContentSchema,
  commentContentSchema,
} from './validation';
import { ZodError } from 'zod';

describe('Sanitization functions', () => {
  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeString('<p>Hello</p>')).toBe('Hello');
      expect(sanitizeString('<script>alert("xss")</script>Hello')).toBe('Hello');
    });

    it('should remove dangerous JavaScript protocols', () => {
      expect(sanitizeString('javascript:alert("xss")')).toBe('alert("xss")');
      expect(sanitizeString('onclick="alert(1)"')).toBe('');
    });

    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should handle empty strings', () => {
      expect(sanitizeString('')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(sanitizeString(null as any)).toBe('');
      expect(sanitizeString(undefined as any)).toBe('');
    });
  });

  describe('sanitizeEmail', () => {
    it('should sanitize email and convert to lowercase', () => {
      expect(sanitizeEmail('  Test@Example.COM  ')).toBe('test@example.com');
    });

    it('should remove HTML tags from email', () => {
      expect(sanitizeEmail('<script>test@example.com</script>')).toBe('test@example.com');
    });
  });

  describe('sanitizeUrl', () => {
    it('should validate and return valid URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
    });

    it('should reject invalid URLs', () => {
      expect(sanitizeUrl('not-a-url')).toBeNull();
      expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
    });

    it('should reject non-http/https protocols', () => {
      expect(sanitizeUrl('ftp://example.com')).toBeNull();
    });
  });

  describe('sanitizeUsername', () => {
    it('should keep only alphanumeric, underscores, and hyphens', () => {
      expect(sanitizeUsername('user_name-123')).toBe('user_name-123');
      expect(sanitizeUsername('user@name#123')).toBe('username123');
    });

    it('should remove HTML tags', () => {
      expect(sanitizeUsername('<script>user</script>')).toBe('user');
    });
  });

  describe('sanitizeTextContent', () => {
    it('should preserve line breaks', () => {
      const text = '<p>Line 1</p><br/><p>Line 2</p>';
      const result = sanitizeTextContent(text);
      expect(result).toContain('\n');
    });

    it('should remove HTML tags', () => {
      expect(sanitizeTextContent('<p>Hello</p>')).toBe('Hello');
    });

    it('should decode HTML entities', () => {
      expect(sanitizeTextContent('&amp; &lt; &gt;')).toBe('& < >');
    });
  });
});

describe('Validation schemas', () => {
  describe('emailSchema', () => {
    it('should validate correct emails', () => {
      const result = emailSchema.safeParse('test@example.com');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('test@example.com');
      }
    });

    it('should reject invalid emails', () => {
      const result = emailSchema.safeParse('not-an-email');
      expect(result.success).toBe(false);
    });

    it('should sanitize and lowercase emails', () => {
      const result = emailSchema.safeParse('  Test@Example.COM  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('test@example.com');
      }
    });
  });

  describe('passwordSchema', () => {
    it('should validate strong passwords', () => {
      const result = passwordSchema.safeParse('Password123');
      expect(result.success).toBe(true);
    });

    it('should reject short passwords', () => {
      const result = passwordSchema.safeParse('Pass1');
      expect(result.success).toBe(false);
    });

    it('should require uppercase letter', () => {
      const result = passwordSchema.safeParse('password123');
      expect(result.success).toBe(false);
    });

    it('should require lowercase letter', () => {
      const result = passwordSchema.safeParse('PASSWORD123');
      expect(result.success).toBe(false);
    });

    it('should require number', () => {
      const result = passwordSchema.safeParse('Password');
      expect(result.success).toBe(false);
    });
  });

  describe('usernameSchema', () => {
    it('should validate correct usernames', () => {
      const result = usernameSchema.safeParse('user_name-123');
      expect(result.success).toBe(true);
    });

    it('should reject short usernames', () => {
      const result = usernameSchema.safeParse('ab');
      expect(result.success).toBe(false);
    });

    it('should reject usernames with special characters', () => {
      const result = usernameSchema.safeParse('user@name');
      expect(result.success).toBe(false);
    });

    it('should sanitize usernames', () => {
      const result = usernameSchema.safeParse('  user_name  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('user_name');
      }
    });
  });

  describe('postContentSchema', () => {
    it('should validate post content', () => {
      const result = postContentSchema.safeParse('This is a post');
      expect(result.success).toBe(true);
    });

    it('should reject empty content', () => {
      const result = postContentSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should reject content that is too long', () => {
      const longContent = 'a'.repeat(5001);
      const result = postContentSchema.safeParse(longContent);
      expect(result.success).toBe(false);
    });

    it('should sanitize HTML from content', () => {
      const result = postContentSchema.safeParse('<script>alert(1)</script>Hello');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toContain('<script>');
      }
    });
  });

  describe('commentContentSchema', () => {
    it('should validate comment content', () => {
      const result = commentContentSchema.safeParse('This is a comment');
      expect(result.success).toBe(true);
    });

    it('should reject content that is too long', () => {
      const longContent = 'a'.repeat(1001);
      const result = commentContentSchema.safeParse(longContent);
      expect(result.success).toBe(false);
    });
  });
});

describe('formatValidationErrors', () => {
  it('should format single error', () => {
    const error = new ZodError([
      {
        code: 'too_small',
        minimum: 3,
        type: 'string',
        inclusive: true,
        path: ['username'],
        message: 'String must contain at least 3 character(s)',
      },
    ]);

    const formatted = formatValidationErrors(error);
    expect(formatted.message).toContain('username');
    expect(formatted.errors).toHaveLength(1);
  });

  it('should format multiple errors', () => {
    const error = new ZodError([
      {
        code: 'too_small',
        minimum: 3,
        type: 'string',
        inclusive: true,
        path: ['username'],
        message: 'String must contain at least 3 character(s)',
      },
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['email'],
        message: 'Expected string, received number',
      },
    ]);

    const formatted = formatValidationErrors(error);
    expect(formatted.errors).toHaveLength(2);
    expect(formatted.message).toContain('2 errores');
  });

  it('should provide descriptive error messages in Spanish', () => {
    const error = new ZodError([
      {
        code: 'too_small',
        minimum: 8,
        type: 'string',
        inclusive: true,
        path: ['password'],
        message: 'String must contain at least 8 character(s)',
      },
    ]);

    const formatted = formatValidationErrors(error);
    expect(formatted.errors[0].message).toContain('al menos 8 caracteres');
  });
});

