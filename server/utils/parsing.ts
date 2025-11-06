/**
 * Text parsing utilities for extracting hashtags, @mentions, and $tickers
 * Includes normalization and validation helpers
 */

export interface ParsedContent {
  text: string;
  hashtags: string[];
  mentions: string[];
  tickers: string[];
}

/**
 * Extract hashtags from text
 * @param text Input text
 * @returns Array of normalized hashtags (without # prefix, lowercase)
 */
export const extractHashtags = (text: string): string[] => {
  const tags = new Set<string>();
  const matches = text.matchAll(/#[\p{L}0-9_]{2,30}/gu);
  for (const m of Array.from(matches)) {
    tags.add(m[0].slice(1).toLowerCase());
  }
  return Array.from(tags);
};

/**
 * Extract @mentions from text
 * @param text Input text
 * @returns Array of usernames (without @ prefix)
 */
export const extractMentions = (text: string): string[] => {
  const users = new Set<string>();
  const matches = text.matchAll(/@(\w{2,30})/g);
  for (const m of Array.from(matches)) {
    users.add(m[1]);
  }
  return Array.from(users);
};

/**
 * Extract $tickers from text
 * @param text Input text
 * @returns Array of stock tickers (without $ prefix)
 */
export const extractTickers = (text: string): string[] => {
  const t = new Set<string>();
  const matches = text.matchAll(/\$[A-Z]{1,5}\b/g);
  for (const m of Array.from(matches)) {
    t.add(m[0].slice(1));
  }
  return Array.from(t);
};

/**
 * Parse all entities from text
 * @param text Input text
 * @returns Parsed content with extracted entities
 */
export function parseContent(text: string): ParsedContent {
  return {
    text,
    hashtags: extractHashtags(text),
    mentions: extractMentions(text),
    tickers: extractTickers(text),
  };
}

/**
 * Normalize hashtag for database storage and search
 * @param hashtag Raw hashtag (with or without #)
 * @returns Normalized hashtag (lowercase, no special chars)
 */
export function normalizeHashtag(hashtag: string): string {
  return hashtag.replace(/^#/, '').toLowerCase().trim();
}

/**
 * Normalize username/handle for database storage and search
 * @param username Raw username (with or without @)
 * @returns Normalized username (lowercase, alphanumeric only)
 */
export function normalizeUsername(username: string): string {
  return username.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]/g, '');
}

/**
 * Normalize ticker for database storage and search
 * @param ticker Raw ticker (with or without $)
 * @returns Normalized ticker (uppercase, letters only)
 */
export function normalizeTicker(ticker: string): string {
  return ticker.replace(/^\$/, '').toUpperCase().replace(/[^A-Z]/g, '');
}

/**
 * Validate ticker symbol format
 * @param ticker Ticker symbol
 * @returns True if valid ticker format (1-5 uppercase letters)
 */
export function isValidTicker(ticker: string): boolean {
  const normalized = normalizeTicker(ticker);
  return /^[A-Z]{1,5}$/.test(normalized);
}

/**
 * Resolve @mentions to user IDs
 * This is a placeholder - implement with actual database lookup
 * @param mentions Array of usernames
 * @returns Map of username to user ID
 */
export async function resolveMentions(
  mentions: string[],
  db: any
): Promise<Map<string, number>> {
  const resolved = new Map<string, number>();
  
  return resolved;
}

/**
 * Highlight entities in text for display
 * @param text Original text
 * @param options Highlighting options
 * @returns Text with highlighted entities
 */
export function highlightEntities(
  text: string,
  options: {
    hashtagClass?: string;
    mentionClass?: string;
    tickerClass?: string;
  } = {}
): string {
  let highlighted = text;

  highlighted = highlighted.replace(
    /#(\w+)/g,
    `<span class="${options.hashtagClass || 'hashtag'}">#$1</span>`
  );

  highlighted = highlighted.replace(
    /@(\w+)/g,
    `<span class="${options.mentionClass || 'mention'}">@$1</span>`
  );

  highlighted = highlighted.replace(
    /\$([A-Z]{1,5})\b/g,
    `<span class="${options.tickerClass || 'ticker'}">$$1</span>`
  );

  return highlighted;
}
