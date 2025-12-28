-- Generated Images table and Storage Bucket
-- Stores references to AI-generated images with public URLs

-- Create the generated_images table
CREATE TABLE IF NOT EXISTS generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES content_sessions(id) ON DELETE SET NULL,
  storage_path TEXT,
  public_url TEXT,
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  model_used TEXT NOT NULL,
  aspect_ratio TEXT DEFAULT '16:9',
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  mime_type TEXT DEFAULT 'image/png',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

-- RLS policies for generated_images
CREATE POLICY "Users can view own images" ON generated_images
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own images" ON generated_images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own images" ON generated_images
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for efficient lookups
CREATE INDEX idx_generated_images_session ON generated_images(session_id);
CREATE INDEX idx_generated_images_user ON generated_images(user_id);
CREATE INDEX idx_generated_images_created ON generated_images(created_at DESC);

-- Create PUBLIC storage bucket for generated images
-- Public bucket = URLs never expire, simpler implementation
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-images', 'generated-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
-- Anyone can view images (public bucket)
CREATE POLICY "Anyone can view generated images" ON storage.objects
  FOR SELECT USING (bucket_id = 'generated-images');

-- Users can upload to their own folder (path starts with user_id)
CREATE POLICY "Users can upload own generated images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'generated-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete from their own folder
CREATE POLICY "Users can delete own generated images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'generated-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
