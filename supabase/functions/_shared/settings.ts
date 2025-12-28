/**
 * Settings loader for Edge Functions
 *
 * Rule 1: No Hardcoded Values
 * All configurable values are loaded from the database.
 */

import { getSupabaseAdmin } from "./supabase.ts";

// Cache for settings (short TTL to balance performance and freshness)
const settingsCache: Map<string, { value: unknown; expiresAt: number }> = new Map();
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

/**
 * Get a setting value from the database
 */
export async function getSetting<T>(
  category: string,
  key: string,
  defaultValue: T
): Promise<T> {
  const cacheKey = `${category}:${key}`;

  // Check cache first
  const cached = settingsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("category", category)
      .eq("key", key)
      .single();

    if (error || !data) {
      return defaultValue;
    }

    const value = data.value?.value as T ?? defaultValue;

    // Update cache
    settingsCache.set(cacheKey, {
      value,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return value;
  } catch {
    return defaultValue;
  }
}

/**
 * Get all settings for a category
 */
export async function getSettingsForCategory(
  category: string
): Promise<Record<string, unknown>> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("category", category);

    if (error || !data) {
      return {};
    }

    const settings: Record<string, unknown> = {};
    for (const row of data) {
      settings[row.key] = row.value?.value;
    }

    return settings;
  } catch {
    return {};
  }
}

/**
 * Edge Function config helper - gets all relevant settings for a function
 */
export async function getEdgeFunctionConfig(
  functionName: string
): Promise<Record<string, unknown>> {
  const settings = await getSettingsForCategory("edge_function");

  // Filter settings that start with the function name
  const prefix = functionName.replace(/-/g, "_") + "_";
  const config: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(settings)) {
    if (key.startsWith(prefix)) {
      // Remove prefix to get clean key name
      const cleanKey = key.slice(prefix.length);
      config[cleanKey] = value;
    }
  }

  return config;
}

/**
 * Common settings getters for Edge Functions
 */
export const EdgeFunctionSettings = {
  // Brain Dump Parser
  async parseBrainDump() {
    return {
      maxThemes: await getSetting<number>("edge_function", "parse_brain_dump_max_themes", 5),
      model: await getSetting<string>("edge_function", "parse_brain_dump_model", "anthropic/claude-sonnet-4-5"),
    };
  },

  // Research Generator
  async generateResearch() {
    return {
      model: await getSetting<string>("edge_function", "generate_research_model", "perplexity/sonar-pro"),
      temperature: await getSetting<number>("edge_function", "generate_research_temperature", 0.3),
      maxTokens: await getSetting<number>("edge_function", "generate_research_max_tokens", 4096),
    };
  },

  // Outline Generator
  async generateOutlines() {
    return {
      model: await getSetting<string>("edge_function", "generate_outlines_model", "anthropic/claude-sonnet-4-5"),
      minSections: await getSetting<number>("edge_function", "generate_outlines_min_sections", 3),
      maxSections: await getSetting<number>("edge_function", "generate_outlines_max_sections", 6),
      temperature: await getSetting<number>("edge_function", "generate_outlines_temperature", 0.7),
      maxTokens: await getSetting<number>("edge_function", "generate_outlines_max_tokens", 8192),
    };
  },

  // Draft Writer
  async draftWriter() {
    return {
      model: await getSetting<string>("edge_function", "draft_writer_model", "anthropic/claude-sonnet-4-5"),
      targetWords: await getSetting<number>("edge_function", "draft_writer_target_words", 1500),
      temperature: await getSetting<number>("edge_function", "draft_writer_temperature", 0.8),
      maxTokens: await getSetting<number>("edge_function", "draft_writer_max_tokens", 8192),
    };
  },

  // Alias for generate-draft function
  async generateDraft() {
    return this.draftWriter();
  },

  // Voice Checker
  async voiceChecker() {
    return {
      model: await getSetting<string>("edge_function", "voice_checker_model", "anthropic/claude-haiku-4-5"),
      threshold: await getSetting<number>("edge_function", "voice_checker_threshold", 0.7),
    };
  },

  // Headline Generator
  async headlineGenerator() {
    return {
      model: await getSetting<string>("edge_function", "headline_generator_model", "anthropic/claude-sonnet-4-5"),
      count: await getSetting<number>("edge_function", "headline_generator_count", 5),
    };
  },

  // Image Generator
  async imageGenerator() {
    return {
      model: await getSetting<string>("edge_function", "image_generator_model", "google/gemini-3-pro-image"),
      fallbackModel: await getSetting<string>("edge_function", "image_generator_fallback_model", "openai/dall-e-3"),
    };
  },

  // YouTube Script Writer
  async youtubeScriptWriter() {
    return {
      model: await getSetting<string>("edge_function", "youtube_script_model", "anthropic/claude-sonnet-4-5"),
      temperature: await getSetting<number>("edge_function", "youtube_script_temperature", 0.7),
      maxTokens: await getSetting<number>("edge_function", "youtube_script_max_tokens", 8192),
    };
  },

  // TikTok Script Writer
  async tiktokScriptWriter() {
    return {
      model: await getSetting<string>("edge_function", "tiktok_script_model", "anthropic/claude-haiku-4-5"),
      temperature: await getSetting<number>("edge_function", "tiktok_script_temperature", 0.8),
      maxTokens: await getSetting<number>("edge_function", "tiktok_script_max_tokens", 4096),
    };
  },

  // Image Prompt Generator
  async imagePromptGenerator() {
    return {
      model: await getSetting<string>("edge_function", "image_prompt_model", "anthropic/claude-sonnet-4-5"),
      temperature: await getSetting<number>("edge_function", "image_prompt_temperature", 0.8),
      maxTokens: await getSetting<number>("edge_function", "image_prompt_max_tokens", 4096),
    };
  },
};
