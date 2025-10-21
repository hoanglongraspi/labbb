-- Add optional media and summary fields to educational content
ALTER TABLE "educational_content"
  ADD COLUMN IF NOT EXISTS "summary" TEXT,
  ADD COLUMN IF NOT EXISTS "hero_image_url" TEXT,
  ADD COLUMN IF NOT EXISTS "resource_url" TEXT;
