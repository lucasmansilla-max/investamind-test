-- Migration: Update stories table to store images as base64 in database

-- Add new columns for image data
ALTER TABLE stories ADD COLUMN IF NOT EXISTS image_data TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- Drop old image_url column (optional - uncomment if you want to remove it completely)
-- ALTER TABLE stories DROP COLUMN IF EXISTS image_url;

-- Comment: We're using TEXT for image_data to store base64 encoded images
-- This keeps images in the database rather than file system
-- mime_type stores the image type (image/jpeg, image/png, etc.)
