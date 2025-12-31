-- Seed all prompt variables into the registry
-- Convention: {source}_{description}_{creator}

INSERT INTO prompt_variables (
  variable_name, display_name, description,
  source_table, source_column, available_after_stage,
  creator, category, is_json_path, json_transform, fallback_value, sort_order
) VALUES

-- ============================================
-- SESSION & METADATA (available at all stages)
-- ============================================
('session_id_system', 'Session ID', 'Unique session identifier',
 'content_sessions', 'id', 'all', 'system', 'session', FALSE, NULL, NULL, 0),

('session_title_user', 'Session Title', 'User-defined session title',
 'content_sessions', 'title', 'all', 'user', 'session', FALSE, NULL, 'Untitled Session', 1),

('session_status_system', 'Session Status', 'Current pipeline stage',
 'content_sessions', 'status', 'all', 'system', 'session', FALSE, NULL, NULL, 2),

('session_created_at_system', 'Session Created', 'Session creation timestamp',
 'content_sessions', 'created_at', 'all', 'system', 'session', FALSE, NULL, NULL, 3),

-- ============================================
-- BRAIN DUMP STAGE (create)
-- ============================================
('brain_dump_raw_user', 'Raw Brain Dump', 'Original unstructured brain dump text from user',
 'content_brain_dumps', 'raw_content', 'create', 'user', 'brain_dump', FALSE, NULL,
 'No brain dump content provided.', 10),

('brain_dump_themes_ai', 'Extracted Themes', 'AI-extracted theme names from brain dump',
 'content_brain_dumps', 'extracted_themes.themes', 'create', 'ai', 'brain_dump', TRUE, 'array_pluck_theme', NULL, 11),

('brain_dump_theme_descriptions_ai', 'Theme Descriptions', 'Detailed descriptions of each extracted theme',
 'content_brain_dumps', 'extracted_themes.themes', 'create', 'ai', 'brain_dump', TRUE, 'array_pluck_description', NULL, 12),

('brain_dump_potential_angles_ai', 'Potential Angles', 'Suggested content angles for each theme',
 'content_brain_dumps', 'extracted_themes.themes', 'create', 'ai', 'brain_dump', TRUE, 'array_pluck_potential_angles', NULL, 13),

('brain_dump_related_topics_ai', 'Related Topics', 'Related topics for each theme',
 'content_brain_dumps', 'extracted_themes.themes', 'create', 'ai', 'brain_dump', TRUE, 'array_pluck_related_topics', NULL, 14),

('brain_dump_key_insights_ai', 'Key Insights', 'Key insights extracted from brain dump',
 'content_brain_dumps', 'extracted_themes.key_insights', 'create', 'ai', 'brain_dump', TRUE, 'array_join', NULL, 15),

('brain_dump_suggested_queries_ai', 'Suggested Research Queries', 'AI-suggested research queries',
 'content_brain_dumps', 'extracted_themes.suggested_research_queries', 'create', 'ai', 'brain_dump', TRUE, 'array_join', NULL, 16),

('brain_dump_overall_direction_ai', 'Overall Direction', 'Overall content direction recommendation',
 'content_brain_dumps', 'extracted_themes.overall_direction', 'create', 'ai', 'brain_dump', TRUE, NULL, NULL, 17),

('brain_dump_selected_themes_user', 'Selected Themes', 'User-selected theme indices',
 'content_brain_dumps', 'user_selections.selected_theme_indices', 'create', 'user', 'brain_dump', TRUE, 'array_join', NULL, 18),

('brain_dump_selected_queries_user', 'Selected Queries', 'User-selected query indices',
 'content_brain_dumps', 'user_selections.selected_query_indices', 'create', 'user', 'brain_dump', TRUE, 'array_join', NULL, 19),

('brain_dump_selected_insights_user', 'Selected Insights', 'User-selected insight indices',
 'content_brain_dumps', 'user_selections.selected_insight_indices', 'create', 'user', 'brain_dump', TRUE, 'array_join', NULL, 20),

('brain_dump_skip_research_user', 'Skip Research Flag', 'Whether user opted to skip research',
 'content_brain_dumps', 'user_selections.skip_research', 'create', 'user', 'brain_dump', TRUE, NULL, 'false', 21),

-- ============================================
-- RESEARCH STAGE
-- ============================================
('research_query_user', 'Research Query', 'Research topic/query entered by user',
 'content_research', 'query', 'research', 'user', 'research', FALSE, NULL,
 'No research query provided.', 30),

('research_response_ai', 'Research Response', 'Full AI-generated research content (markdown)',
 'content_research', 'response', 'research', 'ai', 'research', FALSE, NULL, NULL, 31),

('research_citations_ai', 'Research Citations', 'Citation sources from research',
 'content_research', 'sources', 'research', 'ai', 'research', TRUE, 'stringify', '[]', 32),

('research_notes_user', 'Research Notes', 'User commentary on research results',
 'content_research', 'user_notes', 'research', 'user', 'research', FALSE, NULL,
 'No research notes provided.', 33),

-- ============================================
-- OUTLINE STAGE
-- ============================================
('outline_json_ai', 'Full Outline', 'Complete outline structure as JSON',
 'content_outlines', 'outline_json', 'outline', 'ai', 'outline', TRUE, 'stringify', NULL, 40),

('outline_title_ai', 'Outline Title', 'Generated article title',
 'content_outlines', 'outline_json.title', 'outline', 'ai', 'outline', TRUE, NULL, NULL, 41),

('outline_subtitle_ai', 'Outline Subtitle', 'Generated article subtitle',
 'content_outlines', 'outline_json.subtitle', 'outline', 'ai', 'outline', TRUE, NULL, NULL, 42),

('outline_hook_ai', 'Opening Hook', 'Opening hook concept',
 'content_outlines', 'outline_json.hook', 'outline', 'ai', 'outline', TRUE, NULL, NULL, 43),

('outline_target_audience_ai', 'Target Audience', 'Target audience description',
 'content_outlines', 'outline_json.target_audience', 'outline', 'ai', 'outline', TRUE, NULL, NULL, 44),

('outline_main_argument_ai', 'Main Argument', 'Main thesis/argument',
 'content_outlines', 'outline_json.main_argument', 'outline', 'ai', 'outline', TRUE, NULL, NULL, 45),

('outline_sections_ai', 'Outline Sections', 'Section array with titles and key points',
 'content_outlines', 'outline_json.sections', 'outline', 'ai', 'outline', TRUE, 'stringify', NULL, 46),

('outline_conclusion_ai', 'Conclusion Approach', 'How to conclude the article',
 'content_outlines', 'outline_json.conclusion_approach', 'outline', 'ai', 'outline', TRUE, NULL, NULL, 47),

('outline_cta_ai', 'Call to Action', 'Reader action request',
 'content_outlines', 'outline_json.call_to_action', 'outline', 'ai', 'outline', TRUE, NULL, NULL, 48),

('outline_word_count_ai', 'Estimated Word Count', 'Expected word count for article',
 'content_outlines', 'outline_json.estimated_total_words', 'outline', 'ai', 'outline', TRUE, NULL, NULL, 49),

('outline_tone_notes_ai', 'Tone Notes', 'Voice/tone guidance for the article',
 'content_outlines', 'outline_json.tone_notes', 'outline', 'ai', 'outline', TRUE, NULL, NULL, 50),

('outline_preferences_user', 'Outline Preferences', 'User feedback/preferences on outline',
 'content_outlines', 'user_feedback', 'outline', 'user', 'outline', FALSE, NULL,
 'No specific preferences provided.', 51),

-- ============================================
-- DRAFT STAGE
-- ============================================
('draft_content_ai', 'Draft Content', 'Full draft content',
 'content_drafts', 'content', 'draft', 'ai', 'draft', FALSE, NULL, NULL, 60),

('draft_version_system', 'Draft Version', 'Draft version number',
 'content_drafts', 'version', 'draft', 'system', 'draft', FALSE, NULL, '1', 61),

-- ============================================
-- VOICE ANALYSIS
-- ============================================
('voice_score_overall_ai', 'Voice Score', 'Overall voice match score (0-100)',
 'content_drafts', 'voice_score.overall_score', 'voice', 'ai', 'voice', TRUE, NULL, NULL, 70),

('voice_scores_breakdown_ai', 'Voice Score Breakdown', 'Breakdown by category (tone, style, vocab, personality)',
 'content_drafts', 'voice_score.scores', 'voice', 'ai', 'voice', TRUE, 'stringify', NULL, 71),

('voice_strengths_ai', 'Voice Strengths', 'What matches the target voice well',
 'content_drafts', 'voice_score.strengths', 'voice', 'ai', 'voice', TRUE, 'array_join', NULL, 72),

('voice_warnings_ai', 'Voice Warnings', 'Voice mismatch warnings',
 'content_drafts', 'voice_score.warnings', 'voice', 'ai', 'voice', TRUE, 'array_join', NULL, 73),

('voice_suggestions_ai', 'Voice Suggestions', 'Improvement suggestions for voice match',
 'content_drafts', 'voice_score.suggestions', 'voice', 'ai', 'voice', TRUE, 'array_join', NULL, 74),

-- ============================================
-- OUTPUTS STAGE
-- ============================================
('output_type_system', 'Output Type', 'Type of output (substack_post, youtube_script, etc.)',
 'content_outputs', 'output_type', 'outputs', 'system', 'output', FALSE, NULL, NULL, 80),

('output_content_ai', 'Output Content', 'Generated output content',
 'content_outputs', 'content', 'outputs', 'ai', 'output', FALSE, NULL, NULL, 81),

('output_metadata_ai', 'Output Metadata', 'Output-specific metadata',
 'content_outputs', 'metadata', 'outputs', 'ai', 'output', TRUE, 'stringify', NULL, 82),

-- ============================================
-- USER PROFILE
-- ============================================
('user_id_system', 'User ID', 'User UUID',
 'profiles', 'id', 'all', 'system', 'user', FALSE, NULL, NULL, 90),

('user_display_name_user', 'Display Name', 'User display name',
 'profiles', 'display_name', 'all', 'user', 'user', FALSE, NULL, NULL, 91),

-- ============================================
-- BRAND GUIDELINES (Dynamic)
-- ============================================
('guidelines_image_user', 'Image Guidelines', 'Active image brand guidelines (concatenated)',
 'brand_guidelines', 'content', 'outputs', 'user', 'guidelines', FALSE, 'category_filter:image', NULL, 100),

('guidelines_voice_user', 'Voice Guidelines', 'Active voice brand guidelines (concatenated)',
 'brand_guidelines', 'content', 'draft', 'user', 'guidelines', FALSE, 'category_filter:voice', NULL, 101),

('guidelines_tone_user', 'Tone Guidelines', 'Active tone brand guidelines (concatenated)',
 'brand_guidelines', 'content', 'draft', 'user', 'guidelines', FALSE, 'category_filter:tone', NULL, 102),

-- ============================================
-- DESTINATION/PLATFORM CONFIG
-- ============================================
('destination_slug_system', 'Destination Slug', 'Platform slug (youtube, tiktok, substack)',
 'destinations', 'slug', 'outputs', 'system', 'destination', FALSE, NULL, NULL, 110),

('destination_name_system', 'Destination Name', 'Platform display name',
 'destinations', 'name', 'outputs', 'system', 'destination', FALSE, NULL, NULL, 111),

('destination_requirements_system', 'Platform Requirements', 'Assembled platform requirements text',
 'destinations', 'computed', 'outputs', 'system', 'destination', FALSE, 'compute_requirements', NULL, 112),

('destination_specs_system', 'Platform Specs', 'Platform specs (aspect_ratio, max_chars, etc.)',
 'destinations', 'specs', 'outputs', 'system', 'destination', TRUE, 'stringify', NULL, 113),

('destination_tone_modifiers_system', 'Tone Modifiers', 'Platform tone preferences',
 'destinations', 'tone_modifiers', 'outputs', 'system', 'destination', TRUE, 'array_join', NULL, 114),

-- ============================================
-- AI MODEL CONFIG (System-Injected)
-- ============================================
('model_instructions_system', 'Model Instructions', 'Model-specific prompting tips',
 'ai_models', 'system_prompt_tips', 'all', 'system', 'model', FALSE, NULL, '', 120),

('model_format_system', 'Model Format', 'Model output format instructions',
 'ai_models', 'format_instructions', 'all', 'system', 'model', FALSE, NULL, '', 121),

('model_id_system', 'Model ID', 'Full model identifier (provider/model-name)',
 'ai_models', 'model_id', 'all', 'system', 'model', FALSE, NULL, NULL, 122),

('model_provider_system', 'Model Provider', 'Provider name (anthropic, google, etc.)',
 'ai_models', 'provider', 'all', 'system', 'model', FALSE, NULL, NULL, 123),

-- ============================================
-- GENERATED IMAGES
-- ============================================
('image_url_system', 'Image URL', 'Public URL of generated image',
 'generated_images', 'public_url', 'outputs', 'system', 'image', FALSE, NULL, NULL, 130),

('image_prompt_ai', 'Image Prompt', 'Prompt used to generate the image',
 'generated_images', 'prompt', 'outputs', 'ai', 'image', FALSE, NULL, NULL, 131),

('image_aspect_ratio_user', 'Image Aspect Ratio', 'Aspect ratio (16:9, 1:1, etc.)',
 'generated_images', 'aspect_ratio', 'outputs', 'user', 'image', FALSE, NULL, '16:9', 132),

-- ============================================
-- CONTENT LIBRARY (Imported Posts)
-- ============================================
('library_post_title_user', 'Library Post Title', 'Title of imported post',
 'imported_posts', 'title', 'research', 'user', 'library', FALSE, NULL, NULL, 140),

('library_post_content_user', 'Library Post Content', 'Full content of imported post',
 'imported_posts', 'content', 'research', 'user', 'library', FALSE, NULL, NULL, 141),

('library_post_author_user', 'Library Post Author', 'Author of imported post',
 'imported_posts', 'author', 'research', 'user', 'library', FALSE, NULL, NULL, 142),

('library_post_url_system', 'Library Post URL', 'Original post URL',
 'imported_posts', 'url', 'research', 'system', 'library', FALSE, NULL, NULL, 143),

('library_cross_references_ai', 'Cross References', 'Semantically related posts from library',
 'computed', 'semantic_search', 'draft', 'ai', 'library', FALSE, 'compute_semantic_search', NULL, 144)

ON CONFLICT (variable_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  source_table = EXCLUDED.source_table,
  source_column = EXCLUDED.source_column,
  available_after_stage = EXCLUDED.available_after_stage,
  creator = EXCLUDED.creator,
  category = EXCLUDED.category,
  is_json_path = EXCLUDED.is_json_path,
  json_transform = EXCLUDED.json_transform,
  fallback_value = EXCLUDED.fallback_value,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();
