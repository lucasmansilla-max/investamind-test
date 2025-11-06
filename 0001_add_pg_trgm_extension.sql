-- Migration: Add pg_trgm extension for full-text search
-- This enables fuzzy text search on posts.body using trigram indexes

-- Enable pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index for trigram search on posts.body
CREATE INDEX IF NOT EXISTS community_posts_body_trgm_idx 
  ON community_posts 
  USING GIN (content gin_trgm_ops);

-- Note: This allows efficient similarity searches like:
-- SELECT * FROM community_posts 
-- WHERE content % 'search term'
-- OR similarity(content, 'search term') > 0.3
-- ORDER BY similarity(content, 'search term') DESC;
