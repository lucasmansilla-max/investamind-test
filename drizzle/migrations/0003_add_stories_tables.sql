-- Migration: Add stories and story_likes tables

CREATE TABLE IF NOT EXISTS stories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  image_url TEXT,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  likes_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index to quickly fetch stories by user and recency
CREATE INDEX IF NOT EXISTS stories_user_id_created_at_idx
  ON stories (user_id, created_at DESC);

-- Optional index for active / non-expired stories
CREATE INDEX IF NOT EXISTS stories_active_expires_at_idx
  ON stories (is_active, expires_at);

CREATE TABLE IF NOT EXISTS story_likes (
  id SERIAL PRIMARY KEY,
  story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Prevent duplicate likes per (story, user)
CREATE UNIQUE INDEX IF NOT EXISTS story_likes_story_id_user_id_unique
  ON story_likes (story_id, user_id);

-- Helpful index for fetching who liked a story
CREATE INDEX IF NOT EXISTS story_likes_story_id_idx
  ON story_likes (story_id);
