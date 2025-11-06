/**
 * Cursor pagination utilities for efficient pagination using (createdAt, id) composite cursor
 * Encodes cursors as base64 strings for clean API responses
 */

// Primary export format matching the stub
export type Cursor = { createdAt: string; id: string };

export const encodeCursor = (c: Cursor): string => 
  Buffer.from(JSON.stringify(c)).toString('base64');

export const decodeCursor = (s?: string | null): Cursor | null => {
  if (!s) return null;
  try { 
    return JSON.parse(Buffer.from(s, 'base64').toString('utf8')); 
  } catch { 
    return null; 
  }
};

// Legacy types for backward compatibility
export interface CursorData {
  createdAt: Date;
  id: number;
}

export interface PaginationResult<T> {
  data: T[];
  nextCursor: string | null;
  prevCursor?: string | null;
  hasMore: boolean;
}

/**
 * Encode cursor data (createdAt, id) to base64 string - legacy format
 */
export function encodeCursorLegacy(data: CursorData): string {
  return encodeCursor({
    createdAt: data.createdAt.toISOString(),
    id: data.id.toString(),
  });
}

/**
 * Decode base64 cursor string to cursor data - legacy format
 */
export function decodeCursorLegacy(cursor: string): CursorData | null {
  const decoded = decodeCursor(cursor);
  if (!decoded) return null;
  
  try {
    return {
      createdAt: new Date(decoded.createdAt),
      id: parseInt(decoded.id, 10),
    };
  } catch (error) {
    return null;
  }
}

/**
 * Build pagination result with cursors
 */
export function buildPaginationResult<T extends { createdAt: Date | null; id: number }>(
  items: T[],
  limit: number
): PaginationResult<T> {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;

  const nextCursor = hasMore && data.length > 0 && data[data.length - 1].createdAt
    ? encodeCursor({ 
        createdAt: data[data.length - 1].createdAt!.toISOString(), 
        id: data[data.length - 1].id.toString() 
      })
    : null;

  const prevCursor = data.length > 0 && data[0].createdAt
    ? encodeCursor({ 
        createdAt: data[0].createdAt!.toISOString(), 
        id: data[0].id.toString() 
      })
    : null;

  return {
    data,
    nextCursor,
    prevCursor,
    hasMore,
  };
}

/**
 * Parse pagination query parameters
 */
export function parsePaginationParams(query: {
  cursor?: string;
  limit?: string;
}): {
  cursor: CursorData | null;
  limit: number;
} {
  const cursor = query.cursor ? decodeCursorLegacy(query.cursor) : null;
  const limit = Math.min(Math.max(parseInt(query.limit || '20', 10), 1), 100);

  return { cursor, limit };
}
