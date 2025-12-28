-- AI Models table
CREATE TABLE IF NOT EXISTS ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  display_name TEXT NOT NULL,
  context_window INTEGER,
  max_output_tokens INTEGER,
  supports_images BOOLEAN DEFAULT FALSE,
  supports_streaming BOOLEAN DEFAULT TRUE,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;

-- Anyone can read models
CREATE POLICY "Anyone can read models"
  ON ai_models FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify models
CREATE POLICY "Admins can modify models"
  ON ai_models FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Seed initial AI models
INSERT INTO ai_models (model_id, provider, display_name, context_window, max_output_tokens, supports_images, supports_streaming) VALUES
  ('anthropic/claude-sonnet-4-5', 'anthropic', 'Claude Sonnet 4.5', 200000, 8192, FALSE, TRUE),
  ('anthropic/claude-haiku-4-5', 'anthropic', 'Claude Haiku 4.5', 200000, 8192, FALSE, TRUE),
  ('anthropic/claude-opus-4-5', 'anthropic', 'Claude Opus 4.5', 200000, 8192, FALSE, TRUE),
  ('google/gemini-2.0-flash', 'google', 'Gemini 2.0 Flash', 1000000, 8192, TRUE, TRUE),
  ('google/gemini-2.5-pro', 'google', 'Gemini 2.5 Pro', 2000000, 8192, TRUE, TRUE),
  ('perplexity/sonar-pro', 'perplexity', 'Perplexity Sonar Pro', 200000, 8192, FALSE, TRUE)
ON CONFLICT (model_id) DO NOTHING;
