-- Add extended thinking support for Claude models
-- This enables configurable reasoning/thinking capabilities per model

-- ==============================================================================
-- 1. Add supports_thinking column to ai_models
-- ==============================================================================
ALTER TABLE ai_models ADD COLUMN IF NOT EXISTS supports_thinking BOOLEAN DEFAULT FALSE;

-- ==============================================================================
-- 2. Mark Claude models that support extended thinking
-- ==============================================================================
UPDATE ai_models SET supports_thinking = TRUE
WHERE model_id IN (
  'anthropic/claude-sonnet-4-5',
  'anthropic/claude-opus-4-5',
  'anthropic/claude-haiku-4-5',
  'anthropic/claude-sonnet-4',
  'anthropic/claude-opus-4',
  'anthropic/claude-opus-4-1'
);

-- ==============================================================================
-- 3. Add comment explaining the api_config structure for thinking
-- ==============================================================================
COMMENT ON COLUMN ai_models.supports_thinking IS
'Whether this model supports extended thinking/reasoning. When true, prompts can enable reasoning via api_config: {"reasoning_enabled": true, "reasoning_budget": 10000}';
