import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const POSTS_FILE = join(process.cwd(), 'posts.db.json');

export interface Post {
  id: string;
  createdAt: string;
  author: {
    name: string;
    handle: string;
    avatarInitials: string;
  };
  type: string;
  content: string;
  // Optional trading signal fields
  ticker?: string;
  signalType?: string;
  entryPrice?: string;
  targetPrice?: string;
  stopLoss?: string;
  timeFrame?: string;
  // Optional price prediction fields
  predictedPrice?: string;
  confidenceLevel?: string;
  // Optional market analysis fields
  analysisType?: string;
  // Optional win/loss fields
  resultType?: string;
  valueKind?: string;
  resultValue?: string;
}

export function loadPosts(): Post[] {
  try {
    if (!existsSync(POSTS_FILE)) {
      return [];
    }
    const data = readFileSync(POSTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading posts:', error);
    return [];
  }
}

export function savePosts(posts: Post[]): void {
  try {
    writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving posts:', error);
    throw error;
  }
}
