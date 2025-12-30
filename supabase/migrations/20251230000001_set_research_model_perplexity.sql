-- Set research_generator prompt to use Perplexity Sonar Pro by default
-- This removes the need for hardcoded model overrides in the frontend code
-- Rule 1: No Hardcoded Values - model selection should be database-driven

UPDATE prompt_versions
SET model_id = (
  SELECT id FROM ai_models WHERE model_id = 'perplexity/sonar-pro' LIMIT 1
)
WHERE prompt_set_id = (SELECT id FROM prompt_sets WHERE slug = 'research_generator')
  AND status = 'active';
