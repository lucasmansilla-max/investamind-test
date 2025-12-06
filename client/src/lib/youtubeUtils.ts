/**
 * YouTube URL validation and video ID extraction utilities
 */

/**
 * Validates if a URL is a valid YouTube URL
 * Supports various YouTube URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 */
export function isValidYouTubeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  return youtubeRegex.test(url.trim());
}

/**
 * Extracts the video ID from a YouTube URL
 * Returns null if the URL is invalid or no video ID can be extracted
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmedUrl = url.trim();

  // Pattern 1: youtube.com/watch?v=VIDEO_ID
  const watchMatch = trimmedUrl.match(/(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/);
  if (watchMatch && watchMatch[1]) {
    return watchMatch[1];
  }

  // Pattern 2: youtu.be/VIDEO_ID
  const shortMatch = trimmedUrl.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (shortMatch && shortMatch[1]) {
    return shortMatch[1];
  }

  // Pattern 3: youtube.com/embed/VIDEO_ID
  const embedMatch = trimmedUrl.match(/(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (embedMatch && embedMatch[1]) {
    return embedMatch[1];
  }

  // Pattern 4: youtube.com/v/VIDEO_ID
  const vMatch = trimmedUrl.match(/(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/);
  if (vMatch && vMatch[1]) {
    return vMatch[1];
  }

  return null;
}

/**
 * Converts any YouTube URL to the embed format
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    return null;
  }

  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Gets the standard watch URL from any YouTube URL
 */
export function getYouTubeWatchUrl(url: string): string | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    return null;
  }

  return `https://www.youtube.com/watch?v=${videoId}`;
}

