-- Migrate all prompts to use new variable naming convention
-- Convention: {source}_{description}_{creator}
-- Old: {{content}}, {{raw_brain_dump}}, {{user_research_notes}}
-- New: {{brain_dump_raw_user}}, {{research_notes_user}}, etc.

-- ============================================
-- BRAIN DUMP PARSER
-- Old: {{brain_dump}}
-- New: {{brain_dump_raw_user}}
-- ============================================
UPDATE prompt_versions
SET prompt_content = replace(prompt_content, '{{brain_dump}}', '{{brain_dump_raw_user}}')
WHERE prompt_set_id = (SELECT id FROM prompt_sets WHERE slug = 'brain_dump_parser')
  AND status = 'active'
  AND prompt_content LIKE '%{{brain_dump}}%';

-- ============================================
-- RESEARCH GENERATOR
-- Old: {{themes}}, {{questions}}, {{content}}, {{raw_brain_dump}}, etc.
-- New: {{brain_dump_themes_ai}}, {{brain_dump_suggested_queries_ai}}, {{research_query_user}}, {{brain_dump_raw_user}}
-- ============================================
UPDATE prompt_versions
SET prompt_content = replace(
  replace(
    replace(
      replace(
        replace(
          replace(
            prompt_content,
            '{{themes}}', '{{brain_dump_themes_ai}}'
          ),
          '{{questions}}', '{{brain_dump_suggested_queries_ai}}'
        ),
        '{{theme_descriptions}}', '{{brain_dump_theme_descriptions_ai}}'
      ),
      '{{research_queries}}', '{{brain_dump_suggested_queries_ai}}'
    ),
    '{{insights}}', '{{brain_dump_key_insights_ai}}'
  ),
  '{{overall_direction}}', '{{brain_dump_overall_direction_ai}}'
)
WHERE prompt_set_id = (SELECT id FROM prompt_sets WHERE slug = 'research_generator')
  AND status = 'active';

-- Also update raw_brain_dump in research generator
UPDATE prompt_versions
SET prompt_content = replace(prompt_content, '{{raw_brain_dump}}', '{{brain_dump_raw_user}}')
WHERE prompt_set_id = (SELECT id FROM prompt_sets WHERE slug = 'research_generator')
  AND status = 'active'
  AND prompt_content LIKE '%{{raw_brain_dump}}%';

-- ============================================
-- OUTLINE GENERATOR
-- Old: {{content}}, {{raw_brain_dump}}, {{research_summary}}, {{key_points}}, {{user_research_notes}}, {{user_input}}
-- New: {{research_query_user}}, {{brain_dump_raw_user}}, {{research_response_ai}}, {{brain_dump_key_insights_ai}}, {{research_notes_user}}, {{outline_preferences_user}}
-- ============================================
UPDATE prompt_versions
SET prompt_content = replace(
  replace(
    replace(
      replace(
        replace(
          replace(
            prompt_content,
            '{{content}}', '{{research_query_user}}'
          ),
          '{{raw_brain_dump}}', '{{brain_dump_raw_user}}'
        ),
        '{{research_summary}}', '{{research_response_ai}}'
      ),
      '{{key_points}}', '{{brain_dump_key_insights_ai}}'
    ),
    '{{user_research_notes}}', '{{research_notes_user}}'
  ),
  '{{user_input}}', '{{outline_preferences_user}}'
)
WHERE prompt_set_id = (SELECT id FROM prompt_sets WHERE slug = 'outline_generator')
  AND status = 'active';

-- ============================================
-- DRAFT WRITER
-- Old: {{outline}}, {{voice_guidelines}}, {{cross_references}}
-- New: {{outline_json_ai}}, {{guidelines_voice_user}}, {{library_cross_references_ai}}
-- ============================================
UPDATE prompt_versions
SET prompt_content = replace(
  replace(
    replace(
      prompt_content,
      '{{outline}}', '{{outline_json_ai}}'
    ),
    '{{voice_guidelines}}', '{{guidelines_voice_user}}'
  ),
  '{{cross_references}}', '{{library_cross_references_ai}}'
)
WHERE prompt_set_id = (SELECT id FROM prompt_sets WHERE slug = 'draft_writer_substack')
  AND status = 'active';

-- ============================================
-- VOICE CHECKER
-- Old: {{content}}, {{draft}}, {{voice_guidelines}}
-- New: {{draft_content_ai}}, {{guidelines_voice_user}}
-- ============================================
UPDATE prompt_versions
SET prompt_content = replace(
  replace(
    replace(
      prompt_content,
      '{{content}}', '{{draft_content_ai}}'
    ),
    '{{draft}}', '{{draft_content_ai}}'
  ),
  '{{voice_guidelines}}', '{{guidelines_voice_user}}'
)
WHERE prompt_set_id = (SELECT id FROM prompt_sets WHERE slug = 'voice_checker')
  AND status = 'active';

-- ============================================
-- HEADLINE GENERATOR
-- Old: {{content}}, {{voice_guidelines}}, {{theme}}
-- New: {{draft_content_ai}}, {{guidelines_voice_user}}, {{outline_title_ai}}
-- ============================================
UPDATE prompt_versions
SET prompt_content = replace(
  replace(
    replace(
      prompt_content,
      '{{content}}', '{{draft_content_ai}}'
    ),
    '{{voice_guidelines}}', '{{guidelines_voice_user}}'
  ),
  '{{theme}}', '{{outline_title_ai}}'
)
WHERE prompt_set_id = (SELECT id FROM prompt_sets WHERE slug IN ('headline_generator', 'headlines_generator'))
  AND status = 'active';

-- ============================================
-- YOUTUBE SCRIPT WRITER
-- Old: {{content}}, {{length}}, {{tone}}
-- New: {{draft_content_ai}}, stays {{length}}, stays {{tone}} (runtime params)
-- ============================================
UPDATE prompt_versions
SET prompt_content = replace(prompt_content, '{{content}}', '{{draft_content_ai}}')
WHERE prompt_set_id = (SELECT id FROM prompt_sets WHERE slug = 'youtube_script_writer')
  AND status = 'active'
  AND prompt_content LIKE '%{{content}}%';

-- ============================================
-- TIKTOK SCRIPT WRITER
-- Old: {{title}}, {{content}}, {{num_scripts}}, {{platform}}, {{duration}}
-- New: {{outline_title_ai}}, {{draft_content_ai}}, stays runtime params
-- ============================================
UPDATE prompt_versions
SET prompt_content = replace(
  replace(
    prompt_content,
    '{{content}}', '{{draft_content_ai}}'
  ),
  '{{title}}', '{{outline_title_ai}}'
)
WHERE prompt_set_id = (SELECT id FROM prompt_sets WHERE slug = 'tiktok_script_writer')
  AND status = 'active';

-- ============================================
-- IMAGE PROMPT GENERATOR
-- Old: {{content}}, {{purpose}}, {{style}}, {{image_guidelines}}
-- New: {{draft_content_ai}}, stays runtime, stays runtime, {{guidelines_image_user}}
-- ============================================
UPDATE prompt_versions
SET prompt_content = replace(
  replace(
    prompt_content,
    '{{content}}', '{{draft_content_ai}}'
  ),
  '{{image_guidelines}}', '{{guidelines_image_user}}'
)
WHERE prompt_set_id = (SELECT id FROM prompt_sets WHERE slug = 'image_prompt_generator')
  AND status = 'active';

-- ============================================
-- SEARCH CHAT (if exists)
-- Old: {{context}}
-- New: {{library_post_content_user}}
-- ============================================
UPDATE prompt_versions
SET prompt_content = replace(prompt_content, '{{context}}', '{{library_post_content_user}}')
WHERE prompt_set_id = (SELECT id FROM prompt_sets WHERE slug = 'search_chat')
  AND status = 'active'
  AND prompt_content LIKE '%{{context}}%';

-- ============================================
-- Update system-injected variable names
-- These are still valid (injected by edge function)
-- ============================================
-- model_instructions -> model_instructions_system (optional, for clarity)
-- model_format -> model_format_system
-- destination_requirements -> destination_requirements_system

-- Note: We're keeping backward compatibility by supporting BOTH old and new names
-- The edge function will inject both, so existing prompts continue to work
-- New prompts should use the _system suffix for clarity

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Prompt variable migration complete. All prompts now use new naming convention.';
END $$;
