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

// Pinecone Namespace Management
export type NamespaceSourceType = "newsletter" | "documentation" | "research" | "ideas";

export interface PineconeNamespace {
  id: string;
  slug: string;
  display_name: string;
  description?: string;
  source_type?: NamespaceSourceType;
  is_active: boolean;
  is_searchable: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PineconeNamespaceInsert {
  slug: string;
  display_name: string;
  description?: string;
  source_type?: NamespaceSourceType;
  is_active?: boolean;
  is_searchable?: boolean;
  sort_order?: number;
}

export interface PineconeNamespaceUpdate {
  slug?: string;
  display_name?: string;
  description?: string;
  source_type?: NamespaceSourceType;
  is_active?: boolean;
  is_searchable?: boolean;
  sort_order?: number;
}

// ============================================================================
// Partner API Types
// ============================================================================

// Invite status
export type PartnerInviteStatus = "pending" | "redeemed" | "expired" | "revoked";

export interface PartnerInvite {
  id: string;
  code: string;
  email: string;
  created_by: string;
  expires_at: string;
  redeemed_at?: string;
  redeemed_by?: string;
  status: PartnerInviteStatus;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PartnerInviteInsert {
  code: string;
  email: string;
  created_by: string;
  expires_at?: string;
  metadata?: Record<string, unknown>;
}

// Partner status
export type PartnerStatus = "active" | "suspended" | "revoked";

export interface Partner {
  id: string;
  user_id: string;
  organization_name: string;
  contact_email: string;
  status: PartnerStatus;
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
  invite_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PartnerInsert {
  user_id: string;
  organization_name: string;
  contact_email: string;
  status?: PartnerStatus;
  rate_limit_per_minute?: number;
  rate_limit_per_day?: number;
  invite_id?: string;
  metadata?: Record<string, unknown>;
}

export interface PartnerUpdate {
  organization_name?: string;
  contact_email?: string;
  status?: PartnerStatus;
  rate_limit_per_minute?: number;
  rate_limit_per_day?: number;
  metadata?: Record<string, unknown>;
}

// Namespace permissions
export interface PartnerNamespacePermission {
  id: string;
  partner_id: string;
  namespace_id: string;
  can_read: boolean;
  can_write: boolean;
  created_at: string;
  updated_at: string;
}

export interface PartnerNamespacePermissionWithNamespace
  extends PartnerNamespacePermission {
  pinecone_namespaces: PineconeNamespace;
}

// API Key status
export type ApiKeyStatus = "active" | "revoked";

export interface PartnerApiKey {
  id: string;
  partner_id: string;
  key_hash: string;
  key_prefix: string;
  name: string;
  last_used_at?: string;
  status: ApiKeyStatus;
  expires_at?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PartnerApiKeyInsert {
  partner_id: string;
  key_hash: string;
  key_prefix: string;
  name: string;
  expires_at?: string;
  metadata?: Record<string, unknown>;
}

// API Usage logging
export interface PartnerApiUsage {
  id: string;
  api_key_id: string;
  partner_id: string;
  endpoint: string;
  method: string;
  namespace_slug?: string;
  query_params?: Record<string, unknown>;
  status_code: number;
  response_time_ms?: number;
  error_message?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface PartnerApiUsageInsert {
  api_key_id: string;
  partner_id: string;
  endpoint: string;
  method: string;
  namespace_slug?: string;
  query_params?: Record<string, unknown>;
  status_code: number;
  response_time_ms?: number;
  error_message?: string;
  ip_address?: string;
  user_agent?: string;
}

// API response types
export interface PartnerAuthContext {
  partner: Partner;
  apiKey: PartnerApiKey;
  permissions: PartnerNamespacePermissionWithNamespace[];
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: string;
  dailyLimit: number;
  dailyRemaining: number;
  dailyResetAt: string;
}

export interface PartnerSearchRequest {
  query: string;
  namespaces?: string[];
  topK?: number;
}

export interface PartnerSearchResponse {
  results: SearchResult[];
  query: string;
  namespaces: string[];
  count: number;
  rateLimit: RateLimitInfo;
}

export interface SearchResult {
  id: string;
  score: number;
  title?: string;
  content?: string;
  source?: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

export interface PartnerNamespaceResponse {
  slug: string;
  display_name: string;
  description?: string;
  source_type?: NamespaceSourceType;
  can_read: boolean;
  can_write: boolean;
}

// ============================================================================
// Ideas Capture Types
// ============================================================================

// Idea source types
export type IdeaSourceType =
  | "slack"
  | "recording"
  | "manual"
  | "x_share"
  | "granola"
  | "substack";

// Idea type classification
export type IdeaType =
  | "observation"
  | "question"
  | "concept"
  | "reference"
  | "todo";

// Idea status in the pipeline
export type IdeaStatus = "backlog" | "in_progress" | "drafted" | "archived";

// Idea Cluster - semantic grouping of related ideas
export interface IdeaCluster {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  representative_embedding?: string;
  is_active: boolean;
  idea_count: number;
  created_at: string;
  updated_at: string;
}

export interface IdeaClusterInsert {
  user_id: string;
  name: string;
  description?: string;
  representative_embedding?: string;
  is_active?: boolean;
  idea_count?: number;
}

export interface IdeaClusterUpdate {
  name?: string;
  description?: string;
  representative_embedding?: string;
  is_active?: boolean;
  idea_count?: number;
}

// Slack Idea - captured idea from any source
export interface SlackIdea {
  id: string;
  user_id: string;
  raw_content: string;
  source_type: IdeaSourceType;
  source_url?: string;

  // Slack-specific
  slack_message_id?: string;
  slack_channel_id?: string;
  slack_timestamp?: string;
  slack_user_id?: string;

  // Recording linkage
  recording_id?: string;

  // AI-generated
  summary?: string;
  extracted_topics: string[];
  idea_type?: IdeaType;
  potential_angles: string[];
  embedding_id?: string;

  // Clustering
  cluster_id?: string;
  cluster_confidence?: number;
  cluster?: IdeaCluster;

  // Status
  status: IdeaStatus;
  content_session_id?: string;

  // Pinecone indexing
  pinecone_indexed: boolean;
  pinecone_indexed_at?: string;
  pinecone_error?: string;

  // Timestamps
  captured_at: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SlackIdeaInsert {
  user_id: string;
  raw_content: string;
  source_type: IdeaSourceType;
  source_url?: string;
  slack_message_id?: string;
  slack_channel_id?: string;
  slack_timestamp?: string;
  slack_user_id?: string;
  recording_id?: string;
  status?: IdeaStatus;
  captured_at?: string;
}

export interface SlackIdeaUpdate {
  raw_content?: string;
  summary?: string;
  extracted_topics?: string[];
  idea_type?: IdeaType;
  potential_angles?: string[];
  embedding_id?: string;
  cluster_id?: string;
  cluster_confidence?: number;
  status?: IdeaStatus;
  content_session_id?: string;
  pinecone_indexed?: boolean;
  pinecone_indexed_at?: string;
  pinecone_error?: string;
  processed_at?: string;
}

// AI Processing result for ideas
export interface IdeaSummaryResult {
  summary: string;
  topics: string[];
  type: IdeaType;
  potential_angles: string[];
}

// Cluster naming result
export interface ClusterNameResult {
  name: string;
  description: string;
}

// Slack Integration Config
export type SlackSyncStatus = "idle" | "syncing" | "error";

export interface SlackIntegrationConfig {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  bot_user_id?: string;
  team_id: string;
  team_name?: string;
  channel_id: string;
  channel_name: string;
  last_sync_at?: string;
  last_message_ts?: string;
  sync_status: SlackSyncStatus;
  sync_error?: string;
  messages_synced: number;
  is_active: boolean;
  sync_frequency_minutes: number;
  auto_process: boolean;
  created_at: string;
  updated_at: string;
}

export interface SlackIntegrationConfigInsert {
  user_id: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  bot_user_id?: string;
  team_id: string;
  team_name?: string;
  channel_id: string;
  channel_name?: string;
  is_active?: boolean;
  sync_frequency_minutes?: number;
  auto_process?: boolean;
}

export interface SlackIntegrationConfigUpdate {
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  channel_id?: string;
  channel_name?: string;
  last_sync_at?: string;
  last_message_ts?: string;
  sync_status?: SlackSyncStatus;
  sync_error?: string;
  messages_synced?: number;
  is_active?: boolean;
  sync_frequency_minutes?: number;
  auto_process?: boolean;
}

// Idea vector metadata for Pinecone
export interface IdeaVectorMetadata {
  idea_id: string;
  user_id: string;
  summary: string;
  topics: string[];
  source_type: IdeaSourceType;
  cluster_id?: string;
  created_at: string;
  content_preview: string;
  [key: string]: string | string[] | undefined; // Index signature for Pinecone
}

// ============================================================================
// Content Calendar & Project Management Types
// ============================================================================

// Project status workflow
export type ProjectStatus = "draft" | "review" | "scheduled" | "published";

// Asset status
export type AssetStatus = "draft" | "ready" | "final";

// Asset type classification
export type AssetType =
  | "post"
  | "transcript_youtube"
  | "transcript_tiktok"
  | "description_youtube"
  | "description_tiktok"
  | "prompts"
  | "guide"
  | "post_linkedin"
  | "post_substack"
  | "image_substack";

// Content Project - main project entity
export interface ContentProject {
  id: string;
  project_id: string; // yyyymmdd_xxx format
  title: string;
  scheduled_date: string | null;
  status: ProjectStatus;
  target_platforms: string[];
  notes: string | null;
  video_runtime: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ContentProjectInsert {
  project_id: string;
  title: string;
  scheduled_date?: string | null;
  status?: ProjectStatus;
  target_platforms?: string[];
  notes?: string | null;
  video_runtime?: string | null;
  created_by: string;
}

export interface ContentProjectUpdate {
  project_id?: string;
  title?: string;
  scheduled_date?: string | null;
  status?: ProjectStatus;
  target_platforms?: string[];
  notes?: string | null;
  video_runtime?: string | null;
}

// Project Asset - individual content pieces within a project
export interface ProjectAsset {
  id: string;
  project_id: string;
  asset_type: AssetType | string;
  title: string | null;
  content: string | null;
  current_version: number;
  status: AssetStatus;
  external_url: string | null;
  locked_by: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectAssetInsert {
  project_id: string;
  asset_type: AssetType | string;
  title?: string | null;
  content?: string | null;
  status?: AssetStatus;
  external_url?: string | null;
}

export interface ProjectAssetUpdate {
  asset_type?: AssetType | string;
  title?: string | null;
  content?: string | null;
  current_version?: number;
  status?: AssetStatus;
  external_url?: string | null;
  locked_by?: string | null;
  locked_at?: string | null;
}

// Asset Version - version history for assets
export interface AssetVersion {
  id: string;
  asset_id: string;
  version_number: number;
  content: string;
  created_by: string;
  created_at: string;
}

export interface AssetVersionInsert {
  asset_id: string;
  version_number: number;
  content: string;
  created_by: string;
}

// Project Publication - track where/when content was published
export interface ProjectPublication {
  id: string;
  project_id: string;
  destination_id: string | null;
  platform: string;
  published_at: string;
  published_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ProjectPublicationInsert {
  project_id: string;
  destination_id?: string | null;
  platform: string;
  published_at: string;
  published_url?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ProjectPublicationUpdate {
  destination_id?: string | null;
  platform?: string;
  published_at?: string;
  published_url?: string | null;
  metadata?: Record<string, unknown>;
}

// Lock status for edit locking
export interface LockStatus {
  isLocked: boolean;
  lockedBy: string | null;
  lockedAt: string | null;
  isLockedByCurrentUser: boolean;
}
