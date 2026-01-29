-- Idea Processing Prompts
-- Database-driven prompts for idea summarization, clustering, and conversion

-- Create prompt sets
INSERT INTO prompt_sets (slug, name, prompt_type, description) VALUES
  ('idea_summarizer', 'Idea Summarizer', 'extraction', 'Generate a concise summary and extract topics from a captured idea'),
  ('cluster_namer', 'Cluster Namer', 'generation', 'Generate a descriptive name for an idea cluster based on member ideas'),
  ('idea_to_brain_dump', 'Idea to Brain Dump', 'conversion', 'Convert selected ideas into a structured brain dump for content creation');

-- Idea Summarizer Prompt Version
INSERT INTO prompt_versions (
  prompt_set_id,
  version,
  prompt_content,
  model_id,
  status,
  api_config
)
SELECT
  ps.id,
  1,
  'You are an idea analyzer. Given a raw idea capture (from Slack, voice memo, or manual entry), extract the core concept.

Input:
{{raw_content}}

Source: {{source_type}}

Analyze this idea and return JSON with ONLY these fields:
{
  "summary": "One sentence (max 150 chars) capturing the core idea",
  "topics": ["topic1", "topic2"],
  "type": "observation|question|concept|reference|todo",
  "potential_angles": ["angle1", "angle2"]
}

Guidelines:
- Summary should be actionable and specific, not vague
- Topics should be 2-5 relevant tags (lowercase, no spaces)
- Type indicates what kind of idea this is
- Potential_angles are ways this could become content (2-3 max)

Be concise. Focus on the essence, not verbatim reproduction.',
  (SELECT id FROM ai_models WHERE slug = 'claude-haiku-4-5' LIMIT 1),
  'active',
  '{"temperature": 0.3, "max_tokens": 500}'::jsonb
FROM prompt_sets ps WHERE ps.slug = 'idea_summarizer';

-- Cluster Namer Prompt Version
INSERT INTO prompt_versions (
  prompt_set_id,
  version,
  prompt_content,
  model_id,
  status,
  api_config
)
SELECT
  ps.id,
  1,
  'You are a theme analyzer. Given a set of related ideas, generate a descriptive cluster name.

Ideas in this cluster:
{{idea_summaries}}

Generate a response in JSON format with ONLY these fields:
{
  "name": "Short theme name (2-4 words)",
  "description": "One sentence describing the common thread"
}

Guidelines:
- The name should be memorable and capture the essence of what connects these ideas
- Avoid generic names like "Various Ideas" or "Mixed Topics"
- The description should explain why these ideas belong together
- Keep it professional and clear',
  (SELECT id FROM ai_models WHERE slug = 'claude-haiku-4-5' LIMIT 1),
  'active',
  '{"temperature": 0.5, "max_tokens": 200}'::jsonb
FROM prompt_sets ps WHERE ps.slug = 'cluster_namer';

-- Idea to Brain Dump Converter Prompt Version
INSERT INTO prompt_versions (
  prompt_set_id,
  version,
  prompt_content,
  model_id,
  status,
  api_config
)
SELECT
  ps.id,
  1,
  'You are a content preparation assistant. Convert selected ideas into a cohesive brain dump that can seed the content creation pipeline.

Selected Ideas:
{{selected_ideas}}

Your task is to create a brain dump that:
1. Synthesizes the key themes across the selected ideas
2. Identifies natural connections and threads between them
3. Surfaces potential angles for content development
4. Preserves specific examples, quotes, or insights worth keeping
5. Notes any research questions that arise from these ideas

Output guidelines:
- Write in first person as if the user is thinking through these ideas
- Use natural prose, not bullet points or structured lists
- Connect ideas that relate to each other
- Highlight the most compelling aspects
- Keep the energy and spontaneity of the original ideas
- Aim for 300-500 words

The goal is to give the user a running start on developing these ideas into content.',
  (SELECT id FROM ai_models WHERE slug = 'claude-sonnet-4-5' LIMIT 1),
  'active',
  '{"temperature": 0.7, "max_tokens": 2000}'::jsonb
FROM prompt_sets ps WHERE ps.slug = 'idea_to_brain_dump';

-- Update current_version_id for all new prompt sets
UPDATE prompt_sets SET current_version_id = (
  SELECT id FROM prompt_versions
  WHERE prompt_versions.prompt_set_id = prompt_sets.id
  AND status = 'active'
  ORDER BY version DESC
  LIMIT 1
) WHERE slug IN ('idea_summarizer', 'cluster_namer', 'idea_to_brain_dump');
