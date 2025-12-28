-- App Settings table for configurable values
-- Follows Rule 1: No Hardcoded Values
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(category, key)
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read settings
CREATE POLICY "Authenticated users can read settings"
  ON app_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can modify settings"
  ON app_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Seed default settings

-- Edge Function settings
INSERT INTO app_settings (category, key, value, description) VALUES
  -- Brain Dump Parser settings
  ('edge_function', 'parse_brain_dump_max_themes', '{"value": 5}', 'Maximum number of themes to extract from brain dump'),
  ('edge_function', 'parse_brain_dump_model', '{"value": "anthropic/claude-sonnet-4-5"}', 'AI model for parsing brain dumps'),

  -- Research Generator settings
  ('edge_function', 'generate_research_model', '{"value": "perplexity/sonar-pro"}', 'AI model for research generation'),
  ('edge_function', 'generate_research_temperature', '{"value": 0.3}', 'Temperature for research (lower = more factual)'),
  ('edge_function', 'generate_research_max_tokens', '{"value": 4096}', 'Max tokens for research response'),

  -- Outline Generator settings
  ('edge_function', 'generate_outlines_model', '{"value": "anthropic/claude-sonnet-4-5"}', 'AI model for outline generation'),
  ('edge_function', 'generate_outlines_min_sections', '{"value": 3}', 'Minimum sections in outline'),
  ('edge_function', 'generate_outlines_max_sections', '{"value": 6}', 'Maximum sections in outline'),
  ('edge_function', 'generate_outlines_temperature', '{"value": 0.7}', 'Temperature for outline creativity'),

  -- Draft Writer settings
  ('edge_function', 'draft_writer_model', '{"value": "anthropic/claude-sonnet-4-5"}', 'AI model for draft writing'),
  ('edge_function', 'draft_writer_target_words', '{"value": 1500}', 'Target word count for drafts'),
  ('edge_function', 'draft_writer_temperature', '{"value": 0.8}', 'Temperature for draft creativity'),

  -- Voice Checker settings
  ('edge_function', 'voice_checker_model', '{"value": "anthropic/claude-haiku-4-5"}', 'AI model for voice checking (fast)'),
  ('edge_function', 'voice_checker_threshold', '{"value": 0.7}', 'Minimum voice score threshold'),

  -- Headline Generator settings
  ('edge_function', 'headline_generator_model', '{"value": "anthropic/claude-sonnet-4-5"}', 'AI model for headline generation'),
  ('edge_function', 'headline_generator_count', '{"value": 5}', 'Number of headline options to generate'),

  -- Image Generation settings
  ('edge_function', 'image_generator_model', '{"value": "google/gemini-3-pro-image"}', 'Default image generation model'),
  ('edge_function', 'image_generator_fallback_model', '{"value": "openai/dall-e-3"}', 'Fallback image generation model')
ON CONFLICT (category, key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- General app settings
INSERT INTO app_settings (category, key, value, description) VALUES
  ('general', 'default_output_formats', '{"value": ["substack", "youtube", "tiktok"]}', 'Available output format types'),
  ('general', 'max_sessions_per_user', '{"value": 100}', 'Maximum active sessions per user'),
  ('general', 'ai_call_log_retention_days', '{"value": 30}', 'Days to retain AI call logs')
ON CONFLICT (category, key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_category_key ON app_settings(category, key);
