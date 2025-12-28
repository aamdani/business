// User and Auth types
export interface User {
  id: string;
  email: string;
  role?: "admin" | "user";
  created_at: string;
}

// Content Session types
export type SessionStatus =
  | "brain_dump"
  | "research"
  | "outline"
  | "draft"
  | "review"
  | "outputs"
  | "completed";

export interface ContentSession {
  id: string;
  user_id: string;
  status: SessionStatus;
  title?: string;
  created_at: string;
  updated_at: string;
}

export interface BrainDump {
  id: string;
  session_id: string;
  raw_content: string;
  extracted_themes?: ExtractedThemes;
  created_at: string;
}

export interface ExtractedThemes {
  themes: string[];
  topics: string[];
  potential_angles: string[];
  key_points: string[];
}

export interface ContentResearch {
  id: string;
  session_id: string;
  query: string;
  response: string;
  sources: ResearchSource[];
  created_at: string;
}

export interface ResearchSource {
  title: string;
  url: string;
  snippet?: string;
}

export interface ContentOutline {
  id: string;
  session_id: string;
  outline_json: OutlineData;
  selected: boolean;
  user_feedback?: string;
  created_at: string;
}

export interface OutlineData {
  title: string;
  summary: string;
  sections: OutlineSection[];
  estimated_word_count?: number;
}

export interface OutlineSection {
  heading: string;
  key_points: string[];
  suggested_sources?: string[];
}

export interface ContentDraft {
  id: string;
  session_id: string;
  content: string;
  voice_score?: VoiceScore;
  version: number;
  created_at: string;
}

export interface VoiceScore {
  overall: number;
  profanity_count: number;
  corporate_speak_warnings: string[];
  rhythm_analysis?: string;
}

export interface ContentOutput {
  id: string;
  session_id: string;
  output_type: OutputType;
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export type OutputType =
  | "substack_post"
  | "substack_image"
  | "youtube_script"
  | "youtube_description"
  | "youtube_thumbnail"
  | "tiktok_15s"
  | "tiktok_30s"
  | "tiktok_60s"
  | "shorts_script"
  | "reels_script";

// Prompt Management types
export type PromptStatus = "draft" | "active" | "archived";

export interface PromptSet {
  id: string;
  slug: string;
  name: string;
  prompt_type: string;
  description?: string;
  current_version_id?: string;
  created_at: string;
}

export interface PromptVersion {
  id: string;
  prompt_set_id: string;
  version: number;
  prompt_content: string;
  model_id?: string;
  api_config: ApiConfig;
  status: PromptStatus;
  created_at: string;
}

export interface ApiConfig {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface AIModel {
  id: string;
  model_id: string;
  provider: string;
  display_name: string;
  context_window?: number;
  is_available: boolean;
  created_at: string;
}

// AI Call Logging
export interface AICallLog {
  id: string;
  session_id?: string;
  prompt_set_slug: string;
  full_prompt: string;
  full_response: string;
  model_id: string;
  tokens_in?: number;
  tokens_out?: number;
  duration_ms?: number;
  created_at: string;
}

// Imported Posts
export interface ImportedPost {
  id: string;
  source: "jon" | "nate" | string;
  external_id?: string;
  title: string;
  content: string;
  author: string;
  published_at?: string;
  url?: string;
  created_at: string;
}

export interface SyncManifest {
  id: string;
  source: string;
  last_sync_at: string;
  post_count: number;
  status: "idle" | "syncing" | "error";
  error_message?: string;
}

// Voice Guidelines
export interface VoiceGuidelines {
  id: string;
  name: string;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
