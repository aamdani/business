-- Fix prompt_versions model_ids (was using wrong column name 'slug' instead of 'model_id')

-- brain_dump_parser -> claude-sonnet-4-5
UPDATE prompt_versions SET model_id = (
  SELECT id FROM ai_models WHERE model_id = 'anthropic/claude-sonnet-4-5' LIMIT 1
)
WHERE prompt_set_id = (SELECT id FROM prompt_sets WHERE slug = 'brain_dump_parser');

-- research_generator -> claude-haiku-4-5
UPDATE prompt_versions SET model_id = (
  SELECT id FROM ai_models WHERE model_id = 'anthropic/claude-haiku-4-5' LIMIT 1
)
WHERE prompt_set_id = (SELECT id FROM prompt_sets WHERE slug = 'research_generator');

-- outline_generator -> claude-sonnet-4-5
UPDATE prompt_versions SET model_id = (
  SELECT id FROM ai_models WHERE model_id = 'anthropic/claude-sonnet-4-5' LIMIT 1
)
WHERE prompt_set_id = (SELECT id FROM prompt_sets WHERE slug = 'outline_generator');

-- draft_writer_substack -> claude-sonnet-4-5
UPDATE prompt_versions SET model_id = (
  SELECT id FROM ai_models WHERE model_id = 'anthropic/claude-sonnet-4-5' LIMIT 1
)
WHERE prompt_set_id = (SELECT id FROM prompt_sets WHERE slug = 'draft_writer_substack');

-- voice_checker -> claude-haiku-4-5
UPDATE prompt_versions SET model_id = (
  SELECT id FROM ai_models WHERE model_id = 'anthropic/claude-haiku-4-5' LIMIT 1
)
WHERE prompt_set_id = (SELECT id FROM prompt_sets WHERE slug = 'voice_checker');

-- headline_generator -> claude-sonnet-4-5
UPDATE prompt_versions SET model_id = (
  SELECT id FROM ai_models WHERE model_id = 'anthropic/claude-sonnet-4-5' LIMIT 1
)
WHERE prompt_set_id = (SELECT id FROM prompt_sets WHERE slug = 'headline_generator');

-- youtube_script_writer -> claude-sonnet-4-5
UPDATE prompt_versions SET model_id = (
  SELECT id FROM ai_models WHERE model_id = 'anthropic/claude-sonnet-4-5' LIMIT 1
)
WHERE prompt_set_id = (SELECT id FROM prompt_sets WHERE slug = 'youtube_script_writer');

-- tiktok_script_writer -> claude-haiku-4-5
UPDATE prompt_versions SET model_id = (
  SELECT id FROM ai_models WHERE model_id = 'anthropic/claude-haiku-4-5' LIMIT 1
)
WHERE prompt_set_id = (SELECT id FROM prompt_sets WHERE slug = 'tiktok_script_writer');

-- image_prompt_generator -> claude-sonnet-4-5
UPDATE prompt_versions SET model_id = (
  SELECT id FROM ai_models WHERE model_id = 'anthropic/claude-sonnet-4-5' LIMIT 1
)
WHERE prompt_set_id = (SELECT id FROM prompt_sets WHERE slug = 'image_prompt_generator');
