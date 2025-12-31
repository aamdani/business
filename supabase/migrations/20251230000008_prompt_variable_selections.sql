-- Prompt Variable Selections
-- Stores which variables each prompt uses (user-controlled, not automatic)
-- This enables flexible variable routing - any variable can go to any prompt

-- =====================================================
-- 1. Add missing column to content_research
-- =====================================================

ALTER TABLE content_research
ADD COLUMN IF NOT EXISTS additional_context TEXT;

COMMENT ON COLUMN content_research.additional_context IS 'User-provided additional context for research queries';

-- =====================================================
-- 2. Create prompt_variable_selections table
-- =====================================================

CREATE TABLE IF NOT EXISTS prompt_variable_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links
  prompt_set_id UUID NOT NULL REFERENCES prompt_sets(id) ON DELETE CASCADE,
  variable_id UUID NOT NULL REFERENCES prompt_variables(id) ON DELETE CASCADE,

  -- Selection state
  is_selected BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one selection per prompt-variable pair
  UNIQUE(prompt_set_id, variable_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_prompt_var_selections_prompt
ON prompt_variable_selections(prompt_set_id);

CREATE INDEX IF NOT EXISTS idx_prompt_var_selections_selected
ON prompt_variable_selections(prompt_set_id, is_selected) WHERE is_selected = TRUE;

-- Enable RLS
ALTER TABLE prompt_variable_selections ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read (system config)
CREATE POLICY "Anyone can read prompt_variable_selections"
  ON prompt_variable_selections FOR SELECT
  TO authenticated
  USING (true);

-- Admins can modify
CREATE POLICY "Admins can modify prompt_variable_selections"
  ON prompt_variable_selections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Updated_at trigger
CREATE TRIGGER trigger_prompt_var_selections_updated_at
  BEFORE UPDATE ON prompt_variable_selections
  FOR EACH ROW
  EXECUTE FUNCTION update_prompt_variables_updated_at();

-- =====================================================
-- 3. Add missing variable to registry
-- =====================================================

INSERT INTO prompt_variables (
  variable_name,
  display_name,
  description,
  source_table,
  source_column,
  available_after_stage,
  creator,
  category,
  is_json_path,
  fallback_value,
  sort_order
) VALUES (
  'research_additional_context_user',
  'Research Additional Context',
  'User-provided additional context or notes for research queries',
  'content_research',
  'additional_context',
  'research',
  'user',
  'research',
  FALSE,
  'No additional context provided.',
  25
) ON CONFLICT (variable_name) DO NOTHING;

-- =====================================================
-- 4. Seed default variable selections for existing prompts
--    (Based on which variables each prompt typically uses)
-- =====================================================

-- Helper function to create default selections
DO $$
DECLARE
  prompt_rec RECORD;
  var_rec RECORD;
BEGIN
  -- For each prompt, create selection records for all variables
  -- Default to FALSE (unselected) - user will select what they need
  FOR prompt_rec IN SELECT id FROM prompt_sets LOOP
    FOR var_rec IN SELECT id FROM prompt_variables WHERE is_active = TRUE LOOP
      INSERT INTO prompt_variable_selections (prompt_set_id, variable_id, is_selected)
      VALUES (prompt_rec.id, var_rec.id, FALSE)
      ON CONFLICT (prompt_set_id, variable_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
