// App configuration
export const APP_NAME = "Content Master Pro";
export const APP_DESCRIPTION = "Transform brain dumps into multi-platform content";

// AI Models (Vercel AI Gateway format)
export const AI_MODELS = {
  CLAUDE_SONNET: "anthropic/claude-sonnet-4-5",
  CLAUDE_HAIKU: "anthropic/claude-haiku-4-5",
  CLAUDE_OPUS: "anthropic/claude-opus-4-5",
  GEMINI_FLASH: "google/gemini-2.0-flash",
  GEMINI_PRO: "google/gemini-2.5-pro",
  PERPLEXITY_SONAR: "perplexity/sonar-pro",
} as const;

// Session statuses with display labels
export const SESSION_STATUSES = {
  brain_dump: { label: "Brain Dump", step: 1 },
  research: { label: "Research", step: 2 },
  outline: { label: "Outline", step: 3 },
  draft: { label: "Draft", step: 4 },
  review: { label: "Review", step: 5 },
  outputs: { label: "Outputs", step: 6 },
  completed: { label: "Completed", step: 7 },
} as const;

// Output types with display labels
export const OUTPUT_TYPES = {
  substack_post: { label: "Substack Post", category: "blog" },
  substack_image: { label: "Header Image", category: "blog" },
  youtube_script: { label: "YouTube Script", category: "youtube" },
  youtube_description: { label: "YouTube Description", category: "youtube" },
  youtube_thumbnail: { label: "YouTube Thumbnail", category: "youtube" },
  tiktok_15s: { label: "TikTok (15s)", category: "short-form" },
  tiktok_30s: { label: "TikTok (30s)", category: "short-form" },
  tiktok_60s: { label: "TikTok (60s)", category: "short-form" },
  shorts_script: { label: "YouTube Shorts", category: "short-form" },
  reels_script: { label: "Instagram Reels", category: "short-form" },
} as const;

// Prompt slugs (must match database)
export const PROMPT_SLUGS = {
  BRAIN_DUMP_PARSER: "brain_dump_parser",
  RESEARCH_GENERATOR: "research_generator",
  OUTLINE_GENERATOR: "outline_generator",
  DRAFT_WRITER: "draft_writer_substack",
  VOICE_CHECKER: "voice_checker",
  HEADLINE_GENERATOR: "headline_generator",
  YOUTUBE_SCRIPT_WRITER: "youtube_script_writer",
  TIKTOK_SCRIPT_WRITER: "tiktok_script_writer",
  IMAGE_PROMPT_GENERATOR: "image_prompt_generator",
} as const;

// Pinecone namespaces
export const PINECONE_NAMESPACES = {
  POSTS: "content-hub-posts",
  RESEARCH: "content-hub-research",
  BRAIN_DUMPS: "content-hub-brain-dumps",
} as const;

// API endpoints
export const API_ROUTES = {
  SEARCH: "/api/search",
  SESSION: "/api/session",
  BRAIN_DUMP: "/api/brain-dump",
  RESEARCH: "/api/research",
  OUTLINE: "/api/outline",
  DRAFT: "/api/draft",
  VOICE_CHECK: "/api/voice-check",
  OUTPUTS: "/api/outputs",
} as const;

// Voice defaults
export const VOICE_DEFAULTS = {
  MIN_PROFANITY_RELATIONAL: 2,
  MAX_PROFANITY_RELATIONAL: 4,
  MIN_PROFANITY_ANALYTICAL: 1,
  MAX_PROFANITY_ANALYTICAL: 2,
} as const;
