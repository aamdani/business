-- Prompt Sets table
CREATE TABLE IF NOT EXISTS prompt_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  prompt_type TEXT NOT NULL,
  description TEXT,
  current_version_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prompt Versions table
CREATE TABLE IF NOT EXISTS prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_set_id UUID NOT NULL REFERENCES prompt_sets(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  prompt_content TEXT NOT NULL,
  model_id UUID REFERENCES ai_models(id),
  api_config JSONB DEFAULT '{"temperature": 0.7, "max_tokens": 4096}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prompt_set_id, version)
);

-- Add foreign key for current_version after prompt_versions exists
ALTER TABLE prompt_sets
  ADD CONSTRAINT fk_current_version
  FOREIGN KEY (current_version_id) REFERENCES prompt_versions(id);

-- Enable RLS
ALTER TABLE prompt_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;

-- Anyone can read prompts
CREATE POLICY "Anyone can read prompt_sets"
  ON prompt_sets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can read prompt_versions"
  ON prompt_versions FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify prompts
CREATE POLICY "Admins can modify prompt_sets"
  ON prompt_sets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can modify prompt_versions"
  ON prompt_versions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to get active prompt config
CREATE OR REPLACE FUNCTION get_active_prompt_config(p_slug TEXT)
RETURNS TABLE (
  prompt_set_id UUID,
  slug TEXT,
  name TEXT,
  prompt_type TEXT,
  version_id UUID,
  version INTEGER,
  prompt_content TEXT,
  model_id TEXT,
  api_config JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.id AS prompt_set_id,
    ps.slug,
    ps.name,
    ps.prompt_type,
    pv.id AS version_id,
    pv.version,
    pv.prompt_content,
    am.model_id,
    pv.api_config
  FROM prompt_sets ps
  JOIN prompt_versions pv ON pv.id = ps.current_version_id
  LEFT JOIN ai_models am ON am.id = pv.model_id
  WHERE ps.slug = p_slug
  AND pv.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
