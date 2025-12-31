-- Prompt Variables Registry
-- Defines all variables that can be interpolated into prompts
-- Variables are auto-resolved from database using session_id

-- Add pipeline_stage to prompt_sets to define when prompts run
ALTER TABLE prompt_sets
ADD COLUMN IF NOT EXISTS pipeline_stage TEXT CHECK (
  pipeline_stage IN ('create', 'research', 'outline', 'draft', 'voice', 'outputs', 'utility')
);

-- Create the prompt_variables registry table
CREATE TABLE IF NOT EXISTS prompt_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Variable identification
  variable_name TEXT NOT NULL UNIQUE,  -- e.g., 'brain_dump_raw_user'
  display_name TEXT NOT NULL,          -- e.g., 'Raw Brain Dump'
  description TEXT,                    -- Explains what this variable contains

  -- Data source mapping
  source_table TEXT NOT NULL,          -- e.g., 'content_brain_dumps'
  source_column TEXT NOT NULL,         -- e.g., 'raw_content' or 'extracted_themes.key_insights'

  -- Availability
  available_after_stage TEXT NOT NULL CHECK (
    available_after_stage IN ('create', 'research', 'outline', 'draft', 'voice', 'outputs', 'all')
  ),

  -- Creator type
  creator TEXT NOT NULL CHECK (creator IN ('user', 'ai', 'system')),

  -- Category for UI grouping
  category TEXT NOT NULL,              -- e.g., 'brain_dump', 'research', 'outline'

  -- For nested JSON paths
  is_json_path BOOLEAN DEFAULT FALSE,  -- True if source_column contains a JSON path
  json_transform TEXT,                 -- Optional: 'array_join', 'stringify', etc.

  -- Fallback value
  fallback_value TEXT,                 -- Default if data is null/missing

  -- Metadata
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_prompt_variables_stage
ON prompt_variables(available_after_stage);

CREATE INDEX IF NOT EXISTS idx_prompt_variables_category
ON prompt_variables(category);

CREATE INDEX IF NOT EXISTS idx_prompt_variables_active
ON prompt_variables(is_active) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE prompt_variables ENABLE ROW LEVEL SECURITY;

-- Anyone can read variables (they're system config)
CREATE POLICY "Anyone can read prompt_variables"
  ON prompt_variables FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify
CREATE POLICY "Admins can modify prompt_variables"
  ON prompt_variables FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Update prompt_sets with pipeline stages for existing prompts
UPDATE prompt_sets SET pipeline_stage = 'create' WHERE slug = 'brain_dump_parser';
UPDATE prompt_sets SET pipeline_stage = 'research' WHERE slug = 'research_generator';
UPDATE prompt_sets SET pipeline_stage = 'outline' WHERE slug = 'outline_generator';
UPDATE prompt_sets SET pipeline_stage = 'draft' WHERE slug = 'draft_writer_substack';
UPDATE prompt_sets SET pipeline_stage = 'voice' WHERE slug = 'voice_checker';
UPDATE prompt_sets SET pipeline_stage = 'outputs' WHERE slug IN (
  'headlines_generator',
  'youtube_script_writer',
  'tiktok_script_writer',
  'image_prompt_generator'
);
UPDATE prompt_sets SET pipeline_stage = 'utility' WHERE slug = 'search_chat';

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_prompt_variables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prompt_variables_updated_at
  BEFORE UPDATE ON prompt_variables
  FOR EACH ROW
  EXECUTE FUNCTION update_prompt_variables_updated_at();
