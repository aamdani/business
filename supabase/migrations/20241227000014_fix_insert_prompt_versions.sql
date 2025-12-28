-- Fix: Insert prompt_versions that were missed due to wrong column reference
-- Original migration 000008 used 'slug' but ai_models uses 'model_id'

-- First, delete any orphaned versions (shouldn't exist, but just in case)
DELETE FROM prompt_versions WHERE id NOT IN (
  SELECT current_version_id FROM prompt_sets WHERE current_version_id IS NOT NULL
);

-- Insert prompt versions with correct model_id references
-- brain_dump_parser -> claude-sonnet-4-5
INSERT INTO prompt_versions (prompt_set_id, version, prompt_content, model_id, status, api_config)
SELECT
  ps.id,
  1,
  'You are a brain dump parser. Your job is to extract themes, key ideas, and potential post angles from raw, unstructured text.

Input: {{brain_dump}}

Analyze this brain dump and extract:
1. Main themes (3-5 core topics)
2. Key insights or arguments
3. Potential post angles
4. Questions that need research
5. Personal experiences mentioned

Return as structured JSON with these fields:
- themes: array of theme objects with name and description
- insights: array of key points
- angles: array of potential post directions
- research_needed: array of questions/topics to research
- experiences: array of personal stories mentioned',
  (SELECT id FROM ai_models WHERE model_id = 'anthropic/claude-sonnet-4-5' LIMIT 1),
  'active',
  '{"temperature": 0.3, "max_tokens": 2000}'::jsonb
FROM prompt_sets ps
WHERE ps.slug = 'brain_dump_parser'
AND NOT EXISTS (
  SELECT 1 FROM prompt_versions pv WHERE pv.prompt_set_id = ps.id
);

-- research_generator -> perplexity/sonar-pro (not claude-haiku for research!)
INSERT INTO prompt_versions (prompt_set_id, version, prompt_content, model_id, status, api_config)
SELECT
  ps.id,
  1,
  'You are a research assistant specializing in content creation. Your role is to gather comprehensive, current information on topics.

When researching a topic:
1. Provide factual, well-sourced information
2. Include relevant statistics and data points
3. Present multiple perspectives and viewpoints
4. Highlight recent developments and trends
5. Identify expert opinions and notable quotes
6. Note practical applications and implications

Focus on information that would strengthen a content piece. Be thorough and cite sources when possible.',
  (SELECT id FROM ai_models WHERE model_id = 'perplexity/sonar-pro' LIMIT 1),
  'active',
  '{"temperature": 0.3, "max_tokens": 4096}'::jsonb
FROM prompt_sets ps
WHERE ps.slug = 'research_generator'
AND NOT EXISTS (
  SELECT 1 FROM prompt_versions pv WHERE pv.prompt_set_id = ps.id
);

-- outline_generator -> claude-sonnet-4-5
INSERT INTO prompt_versions (prompt_set_id, version, prompt_content, model_id, status, api_config)
SELECT
  ps.id,
  1,
  'You are an outline generator. Create a single, well-structured outline for a Substack post.

Brain Dump Analysis: {{brain_dump_analysis}}
Research Results: {{research}}
User Direction: {{user_input}}
Voice Guidelines: {{voice_guidelines}}

Create an outline that:
- Has a compelling hook/opening
- Builds a clear argument or narrative
- Incorporates research where relevant
- Ends with actionable takeaways or strong conclusion

Return as JSON with:
- title_suggestion: working title
- hook: opening paragraph concept
- sections: array of section objects (heading, bullet points, notes)
- conclusion: closing concept
- estimated_length: short/medium/long',
  (SELECT id FROM ai_models WHERE model_id = 'anthropic/claude-sonnet-4-5' LIMIT 1),
  'active',
  '{"temperature": 0.7, "max_tokens": 2000}'::jsonb
FROM prompt_sets ps
WHERE ps.slug = 'outline_generator'
AND NOT EXISTS (
  SELECT 1 FROM prompt_versions pv WHERE pv.prompt_set_id = ps.id
);

-- draft_writer_substack -> claude-sonnet-4-5
INSERT INTO prompt_versions (prompt_set_id, version, prompt_content, model_id, status, api_config)
SELECT
  ps.id,
  1,
  'You are a Substack post writer. Write a complete draft following the provided outline and voice guidelines.

Outline: {{outline}}
Voice Guidelines: {{voice_guidelines}}
Cross-References: {{cross_references}}

Writing rules:
- Match the voice guidelines exactly
- Use sentence case for headings (not Title Case)
- Incorporate cross-references naturally as inline links
- Write for email readers (scannable, clear structure)
- Include personal anecdotes where appropriate
- End sections with transitions

Return the full draft in Markdown format.',
  (SELECT id FROM ai_models WHERE model_id = 'anthropic/claude-sonnet-4-5' LIMIT 1),
  'active',
  '{"temperature": 0.8, "max_tokens": 4000}'::jsonb
FROM prompt_sets ps
WHERE ps.slug = 'draft_writer_substack'
AND NOT EXISTS (
  SELECT 1 FROM prompt_versions pv WHERE pv.prompt_set_id = ps.id
);

-- voice_checker -> claude-haiku-4-5
INSERT INTO prompt_versions (prompt_set_id, version, prompt_content, model_id, status, api_config)
SELECT
  ps.id,
  1,
  'You are a voice consistency checker. Analyze the draft against the voice guidelines and provide a score with specific feedback.

Draft: {{draft}}
Voice Guidelines: {{voice_guidelines}}

Evaluate:
1. Tone match (conversational, analytical, etc.)
2. Sentence structure patterns
3. Word choice consistency
4. Personal voice markers
5. Formatting style

Return as JSON:
- score: 0-100
- summary: one-line assessment
- warnings: array of specific issues with line references
- suggestions: array of improvements
- examples: before/after rewrites for issues',
  (SELECT id FROM ai_models WHERE model_id = 'anthropic/claude-haiku-4-5' LIMIT 1),
  'active',
  '{"temperature": 0.3, "max_tokens": 1500}'::jsonb
FROM prompt_sets ps
WHERE ps.slug = 'voice_checker'
AND NOT EXISTS (
  SELECT 1 FROM prompt_versions pv WHERE pv.prompt_set_id = ps.id
);

-- headline_generator -> claude-sonnet-4-5
INSERT INTO prompt_versions (prompt_set_id, version, prompt_content, model_id, status, api_config)
SELECT
  ps.id,
  1,
  'You are a headline generator. Create 5 headline options for this post, ranked by voice match.

Post Content: {{content}}
Voice Guidelines: {{voice_guidelines}}
Post Theme: {{theme}}

Generate 5 headlines that:
- Use sentence case (not Title Case)
- Match the voice guidelines
- Have different angles (curiosity, benefit, controversy, story, insight)
- Are optimized for email subject lines

Return as JSON array of headline objects:
- headline: the headline text
- angle: type of hook used
- voice_score: 0-100 match to guidelines
- reasoning: why this works',
  (SELECT id FROM ai_models WHERE model_id = 'anthropic/claude-sonnet-4-5' LIMIT 1),
  'active',
  '{"temperature": 0.9, "max_tokens": 1000}'::jsonb
FROM prompt_sets ps
WHERE ps.slug = 'headline_generator'
AND NOT EXISTS (
  SELECT 1 FROM prompt_versions pv WHERE pv.prompt_set_id = ps.id
);

-- youtube_script_writer -> claude-sonnet-4-5
INSERT INTO prompt_versions (prompt_set_id, version, prompt_content, model_id, status, api_config)
SELECT
  ps.id,
  1,
  'You are a YouTube script writer. Convert this Substack post into a video script format.

Post Content: {{content}}
Video Length Target: {{length}} minutes
Tone: {{tone}}

Create a script with:
- Hook (first 30 seconds)
- Intro with channel context
- Main content sections with visual cues
- Transitions and callbacks
- Strong CTA ending

Format as:
[VISUAL: description]
[ON CAMERA]
Script text here...

Include timestamps and section markers.',
  (SELECT id FROM ai_models WHERE model_id = 'anthropic/claude-sonnet-4-5' LIMIT 1),
  'active',
  '{"temperature": 0.7, "max_tokens": 3000}'::jsonb
FROM prompt_sets ps
WHERE ps.slug = 'youtube_script_writer'
AND NOT EXISTS (
  SELECT 1 FROM prompt_versions pv WHERE pv.prompt_set_id = ps.id
);

-- tiktok_script_writer -> claude-haiku-4-5
INSERT INTO prompt_versions (prompt_set_id, version, prompt_content, model_id, status, api_config)
SELECT
  ps.id,
  1,
  'You are a TikTok/Shorts script writer. Create punchy, short-form scripts from this content.

Source Content: {{content}}
Target Platform: {{platform}}
Max Duration: {{duration}} seconds

Create 3 script variations:
1. Hook-first (controversy/curiosity)
2. Story-first (personal angle)
3. Value-first (immediate takeaway)

Each script should:
- Start with pattern interrupt
- Be speakable in {{duration}} seconds
- End with engagement hook
- Include suggested captions/text overlays

Return as JSON array with script, captions, and hashtag suggestions.',
  (SELECT id FROM ai_models WHERE model_id = 'anthropic/claude-haiku-4-5' LIMIT 1),
  'active',
  '{"temperature": 0.8, "max_tokens": 1500}'::jsonb
FROM prompt_sets ps
WHERE ps.slug = 'tiktok_script_writer'
AND NOT EXISTS (
  SELECT 1 FROM prompt_versions pv WHERE pv.prompt_set_id = ps.id
);

-- image_prompt_generator -> claude-sonnet-4-5
INSERT INTO prompt_versions (prompt_set_id, version, prompt_content, model_id, status, api_config)
SELECT
  ps.id,
  1,
  'You are an image prompt generator for Nano Banana Pro (Gemini 3 Pro Image). Create prompts following LEJ brand guidelines.

Content Context: {{content}}
Image Purpose: {{purpose}}
Style Notes: {{style}}

LEJ Brand Guidelines:
- Cinematic realism, anti-corporate aesthetic
- Female protagonists when people included
- Rich, moody lighting
- Avoid stock photo feel
- Include environmental storytelling

Generate 3 image prompt options with:
- Detailed scene description
- Lighting and mood
- Camera angle suggestion
- Style modifiers

Return as JSON array with prompt, rationale, and alternative directions.',
  (SELECT id FROM ai_models WHERE model_id = 'anthropic/claude-sonnet-4-5' LIMIT 1),
  'active',
  '{"temperature": 0.8, "max_tokens": 1500}'::jsonb
FROM prompt_sets ps
WHERE ps.slug = 'image_prompt_generator'
AND NOT EXISTS (
  SELECT 1 FROM prompt_versions pv WHERE pv.prompt_set_id = ps.id
);

-- Update current_version_id in prompt_sets
UPDATE prompt_sets SET current_version_id = (
  SELECT id FROM prompt_versions
  WHERE prompt_versions.prompt_set_id = prompt_sets.id
  AND status = 'active'
  ORDER BY version DESC
  LIMIT 1
)
WHERE current_version_id IS NULL;
