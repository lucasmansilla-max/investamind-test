/**
 * Validation and Sanitization Utilities
 * Centralized validation schemas and sanitization functions
 */

import { z } from 'zod';
import { ZodError } from 'zod';

/**
 * Sanitization functions
 */

/**
 * Sanitize string input - removes HTML tags and dangerous characters
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove dangerous JavaScript protocols
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, ''); // Remove event handlers like onclick=
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Sanitize email - removes dangerous characters but keeps valid email format
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    return '';
  }
  
  // Remove HTML tags and dangerous characters
  let sanitized = sanitizeString(email);
  
  // Remove whitespace
  sanitized = sanitized.trim().toLowerCase();
  
  return sanitized;
}

/**
 * Sanitize URL - validates and cleans URLs
 */
export function sanitizeUrl(url: string): string | null {
  if (typeof url !== 'string') {
    return null;
  }
  
  const sanitized = sanitizeString(url.trim());
  
  // Basic URL validation
  try {
    const urlObj = new URL(sanitized);
    // Only allow http and https protocols
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return null;
    }
    return sanitized;
  } catch {
    return null;
  }
}

/**
 * Sanitize username - removes special characters, keeps alphanumeric and underscores
 */
export function sanitizeUsername(username: string): string {
  if (typeof username !== 'string') {
    return '';
  }
  
  // Remove HTML tags
  let sanitized = sanitizeString(username);
  
  // Keep only alphanumeric characters, underscores, and hyphens
  sanitized = sanitized.replace(/[^a-zA-Z0-9_-]/g, '');
  
  return sanitized;
}

/**
 * Sanitize text content - removes HTML but preserves line breaks
 */
export function sanitizeTextContent(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }
  
  // Remove HTML tags but preserve line breaks
  let sanitized = text.replace(/<br\s*\/?>/gi, '\n');
  sanitized = sanitized.replace(/<\/p>/gi, '\n');
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove dangerous protocols
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  
  // Decode HTML entities
  sanitized = sanitized
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  
  return sanitized.trim();
}

/**
 * Format Zod validation errors into user-friendly messages
 */
export function formatValidationErrors(error: ZodError): {
  message: string;
  errors: Array<{ field: string; message: string }>;
} {
  const errors = error.errors.map((err) => {
    const field = err.path.join('.');
    let message = err.message;
    
    // Make error messages more descriptive
    if (err.code === 'too_small') {
      if (err.type === 'string') {
        message = `El campo "${field}" debe tener al menos ${err.minimum} caracteres`;
      } else if (err.type === 'number') {
        message = `El campo "${field}" debe ser al menos ${err.minimum}`;
      }
    } else if (err.code === 'too_big') {
      if (err.type === 'string') {
        message = `El campo "${field}" no puede exceder ${err.maximum} caracteres`;
      } else if (err.type === 'number') {
        message = `El campo "${field}" no puede ser mayor que ${err.maximum}`;
      }
    } else if (err.code === 'invalid_type') {
      message = `El campo "${field}" debe ser de tipo ${err.expected}`;
    } else if (err.code === 'invalid_string') {
      if (err.validation === 'email') {
        message = `El campo "${field}" debe ser un email válido`;
      } else if (err.validation === 'url') {
        message = `El campo "${field}" debe ser una URL válida`;
      }
    } else if (err.code === 'invalid_enum_value') {
      message = `El campo "${field}" debe ser uno de los siguientes valores: ${err.options?.join(', ') || 'valores permitidos'}`;
    }
    
    return {
      field,
      message: message || err.message,
    };
  });
  
  const mainMessage = errors.length === 1
    ? errors[0].message
    : `Se encontraron ${errors.length} errores de validación`;
  
  return {
    message: mainMessage,
    errors,
  };
}

/**
 * Common validation schemas
 */

export const emailSchema = z
  .string()
  .min(1, 'El email es requerido')
  .email('El email no es válido')
  .max(255, 'El email no puede exceder 255 caracteres')
  .transform((val) => sanitizeEmail(val));

export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(128, 'La contraseña no puede exceder 128 caracteres')
  .regex(/[A-Z]/, 'La contraseña debe contener al menos una letra mayúscula')
  .regex(/[a-z]/, 'La contraseña debe contener al menos una letra minúscula')
  .regex(/[0-9]/, 'La contraseña debe contener al menos un número');

export const usernameSchema = z
  .string()
  .min(3, 'El nombre de usuario debe tener al menos 3 caracteres')
  .max(30, 'El nombre de usuario no puede exceder 30 caracteres')
  .regex(/^[a-zA-Z0-9_-]+$/, 'El nombre de usuario solo puede contener letras, números, guiones y guiones bajos')
  .transform((val) => sanitizeUsername(val));

export const nameSchema = z
  .string()
  .min(1, 'Este campo es requerido')
  .max(100, 'Este campo no puede exceder 100 caracteres')
  .transform((val) => sanitizeString(val));

export const bioSchema = z
  .string()
  .max(500, 'La biografía no puede exceder 500 caracteres')
  .optional()
  .transform((val) => val ? sanitizeTextContent(val) : val);

export const urlSchema = z
  .string()
  .url('Debe ser una URL válida')
  .max(2048, 'La URL no puede exceder 2048 caracteres')
  .transform((val) => sanitizeUrl(val))
  .refine((val) => val !== null, { message: 'La URL proporcionada no es válida' })
  .optional();

export const postContentSchema = z
  .string()
  .min(1, 'El contenido del post es requerido')
  .max(5000, 'El contenido del post no puede exceder 5000 caracteres')
  .transform((val) => sanitizeTextContent(val));

export const commentContentSchema = z
  .string()
  .min(1, 'El contenido del comentario es requerido')
  .max(1000, 'El contenido del comentario no puede exceder 1000 caracteres')
  .transform((val) => sanitizeTextContent(val));

export const idParamSchema = z
  .string()
  .regex(/^\d+$/, 'El ID debe ser un número válido')
  .transform((val) => parseInt(val, 10));

/**
 * Auth validation schemas
 */
export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  selectedLanguage: z.enum(['es', 'en']).optional().default('es'),
});

export const signinSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'El token es requerido'),
  newPassword: passwordSchema,
});

/**
 * User update validation schemas
 */
export const updateUserSchema = z.object({
  username: usernameSchema.optional(),
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  bio: bioSchema,
  avatarUrl: urlSchema,
  selectedLanguage: z.enum(['es', 'en']).optional(),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  investmentStyle: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
});

/**
 * Post validation schemas
 */
export const createPostSchema = z.object({
  body: postContentSchema,
  imageUrl: urlSchema,
  messageType: z.enum(['general', 'signal', 'trading_alert']).optional(),
  postType: z.enum(['general', 'ad', 'advertisement']).optional().default('general'),
});

export const updatePostSchema = z.object({
  body: postContentSchema.optional(),
  imageUrl: urlSchema.nullable(),
});

export const feedQuerySchema = z.object({
  sort: z.enum(['recent', 'popular', 'trending']).optional().default('recent'),
  cursor: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return 20;
      const num = parseInt(val, 10);
      if (isNaN(num) || num < 1) return 20;
      return Math.min(num, 100);
    }),
});

/**
 * Comment validation schemas
 */
export const createCommentSchema = z.object({
  body: commentContentSchema,
  parentCommentId: z.number().int().positive().optional(),
});

/**
 * Subscription validation schemas
 */
export const upgradeSubscriptionSchema = z.object({
  planType: z.enum(['premium_monthly', 'premium_yearly'], {
    errorMap: () => ({ message: 'El tipo de plan debe ser premium_monthly o premium_yearly' }),
  }),
});

/**
 * Search validation schemas
 */
export const searchQuerySchema = z.object({
  q: z.string().min(1, 'El término de búsqueda es requerido').max(100, 'El término de búsqueda no puede exceder 100 caracteres'),
  limit: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return 10;
      const num = parseInt(val, 10);
      if (isNaN(num) || num < 1) return 10;
      return Math.min(num, 50);
    }),
});

/**
 * Validation middleware helper
 */
export function validateRequest<T extends z.ZodTypeAny>(
  schema: T,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return (req: any, res: any, next: any) => {
    const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
    
    const result = schema.safeParse(data);
    
    if (!result.success) {
      const formatted = formatValidationErrors(result.error);
      return res.status(400).json({
        message: formatted.message,
        errors: formatted.errors,
        code: 'VALIDATION_ERROR',
      });
    }
    
    // Replace the data with validated and sanitized data
    if (source === 'body') {
      req.body = result.data;
    } else if (source === 'query') {
      req.query = result.data;
    } else {
      req.params = result.data;
    }
    
    next();
  };
}

