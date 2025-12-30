-- Fix voice_checker prompt to return the correct structure
--
-- The TypeScript interface expects:
--   { overall_score, scores: { tone, style, vocabulary, personality }, strengths, warnings, suggestions }
--
-- But the original prompt returned:
--   { score, summary, warnings, suggestions, examples }
--
-- This migration updates the prompt to return the correct structure.

UPDATE prompt_versions
SET prompt_content = 'You are a voice consistency checker. Analyze the draft against the voice guidelines and provide detailed scoring with specific feedback.

Draft:
{{content}}

Voice Guidelines:
{{voice_guidelines}}

Evaluate these four dimensions on a scale of 0-100:

1. **Tone** (0-100): Does the conversational vs analytical balance match the guidelines? Is the emotional register appropriate?

2. **Style** (0-100): Do sentence structures, paragraph flows, and formatting patterns match? Is it appropriately scannable for email?

3. **Vocabulary** (0-100): Is the word choice consistent with the voice? Are technical terms used appropriately? Does profanity usage match guidelines?

4. **Personality** (0-100): Are personal voice markers present? Does it feel authentic? Are personal anecdotes used effectively?

Calculate an overall_score as the weighted average: (tone * 0.25) + (style * 0.25) + (vocabulary * 0.25) + (personality * 0.25)

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "overall_score": 85,
  "scores": {
    "tone": 90,
    "style": 85,
    "vocabulary": 80,
    "personality": 85
  },
  "strengths": [
    "Specific things done well with examples"
  ],
  "warnings": [
    "Specific issues found with line references"
  ],
  "suggestions": [
    "Actionable improvements with before/after examples"
  ]
}

Guidelines for feedback:
- Be specific, not generic. Quote actual text from the draft.
- For warnings, include approximate line numbers or section references.
- For suggestions, provide concrete before/after rewrite examples.
- Each array should have 2-5 items.',
    api_config = '{"temperature": 0.3, "max_tokens": 2000}'::jsonb
WHERE prompt_set_id = (SELECT id FROM prompt_sets WHERE slug = 'voice_checker')
  AND status = 'active';

-- Update current_version_id in prompt_sets to ensure it points to the active version
UPDATE prompt_sets SET current_version_id = (
  SELECT id FROM prompt_versions
  WHERE prompt_versions.prompt_set_id = prompt_sets.id
  AND status = 'active'
  ORDER BY version DESC
  LIMIT 1
)
WHERE slug = 'voice_checker';
