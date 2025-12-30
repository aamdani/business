-- Fix outline_generator prompt to match expected input variables and output format
--
-- Issues being fixed:
-- 1. Variable names: prompt used {{brain_dump_analysis}}, {{research}} but code passes
--    {{content}}, {{research_summary}}, {{key_points}}, {{user_input}}
-- 2. Output format: prompt returned title_suggestion, conclusion, estimated_length
--    but UI expects title, subtitle, hook, target_audience, main_argument, sections,
--    conclusion_approach, call_to_action, estimated_total_words, tone_notes

-- Update the prompt version for outline_generator
UPDATE prompt_versions
SET prompt_content = 'You are an expert content strategist and outline architect. Create a comprehensive, well-structured outline for a Substack newsletter post.

## Input Context:
Topic/Theme: {{content}}

Research Summary:
{{research_summary}}

Key Points & Data:
{{key_points}}

User Direction/Preferences:
{{user_input}}

## Your Task:
Create a detailed outline that transforms this material into a compelling Substack post.

## Output Requirements:
Return a JSON object with EXACTLY this structure:

{
  "outline": {
    "title": "The main headline (sentence case, compelling hook)",
    "subtitle": "Supporting tagline that adds context or intrigue",
    "hook": "The opening paragraph concept - something that grabs attention immediately",
    "target_audience": "Who this is for and why they should care",
    "main_argument": "The core thesis or central point of the post",
    "sections": [
      {
        "title": "Section heading",
        "key_points": ["Point 1", "Point 2", "Point 3"],
        "estimated_words": 300,
        "hook": "Optional opening line for this section"
      }
    ],
    "conclusion_approach": "How to wrap up - the emotional or logical landing point",
    "call_to_action": "What you want readers to do after reading",
    "estimated_total_words": 1500,
    "tone_notes": "Notes on voice, style, and emotional register for this piece"
  },
  "summary": "A one-paragraph summary of what this post will accomplish",
  "alternative_angles": ["Angle 1", "Angle 2", "Angle 3"]
}

## Guidelines:
- Title should be sentence case, not Title Case
- Include 3-6 sections depending on complexity
- Each section should have 2-5 key points
- Total estimated words should be 1000-2500 for a typical Substack post
- Make the hook genuinely attention-grabbing, not generic
- Target audience should be specific, not vague
- Alternative angles give the writer options if they want to pivot

IMPORTANT: Your response must be valid JSON only. No markdown, no explanation, no preamble.',
    api_config = '{"temperature": 0.7, "max_tokens": 3000}'::jsonb
WHERE prompt_set_id = (SELECT id FROM prompt_sets WHERE slug = 'outline_generator')
  AND status = 'active';

-- Also update current_version_id in prompt_sets to ensure it points to the active version
UPDATE prompt_sets SET current_version_id = (
  SELECT id FROM prompt_versions
  WHERE prompt_versions.prompt_set_id = prompt_sets.id
  AND status = 'active'
  ORDER BY version DESC
  LIMIT 1
)
WHERE slug = 'outline_generator';
