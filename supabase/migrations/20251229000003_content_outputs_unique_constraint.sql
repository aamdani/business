-- Add unique constraint on session_id + output_type for content_outputs
-- This enables upsert functionality - one record per output type per session
-- Regenerating an output will update the existing record rather than creating duplicates

ALTER TABLE content_outputs
  ADD CONSTRAINT content_outputs_session_output_unique UNIQUE (session_id, output_type);

-- Add 'image_prompts' to the output_type check constraint
-- This stores the generated prompts (not the actual images, which go in generated_images)
ALTER TABLE content_outputs DROP CONSTRAINT IF EXISTS content_outputs_output_type_check;
ALTER TABLE content_outputs ADD CONSTRAINT content_outputs_output_type_check CHECK (output_type IN (
  'substack_post', 'substack_image',
  'youtube_script', 'youtube_description', 'youtube_thumbnail',
  'tiktok_15s', 'tiktok_30s', 'tiktok_60s',
  'shorts_script', 'reels_script',
  'image_prompts'
));
