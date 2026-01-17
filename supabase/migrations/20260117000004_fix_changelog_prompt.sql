-- Fix changelog ingestion prompt to work with Perplexity's search-based approach
-- The original prompt asked to "analyze" a URL, but Perplexity searches the web

UPDATE prompt_versions
SET prompt_content = 'Search for the latest updates, releases, and changelog entries for {{source_name}}.

Reference their official changelog/release notes at: {{source_url}}

Date range to check: {{date_range}}

Find recent updates and for each one, extract:
1. Headline (concise title, max 100 chars)
2. Summary (2-3 sentences explaining the change and its significance)
3. Impact level: "minor" (bug fix, small improvement), "major" (new feature, significant change), or "breaking" (API changes, deprecations)
4. Published date (if available)

Return ONLY a JSON array with no additional text or explanation:
[
  {
    "headline": "...",
    "summary": "...",
    "impact_level": "minor|major|breaking",
    "published_at": "YYYY-MM-DD" or null
  }
]

Only include updates from the last 7 days. If no recent updates found, return empty array [].
Focus on changes that would matter to developers and AI practitioners.
Skip minor documentation fixes or typo corrections.'
WHERE prompt_set_id = (SELECT id FROM prompt_sets WHERE slug = 'changelog_ingestion')
AND status = 'active';
