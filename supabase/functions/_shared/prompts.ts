/**
 * Prompt loading and interpolation utilities
 *
 * Rule 3: Database-Driven Prompt Management
 * All prompts must be loaded from the database, never hardcoded.
 */

import { getSupabaseAdmin } from "./supabase.ts";

export interface PromptConfig {
  promptSetId: string;
  promptVersionId: string;
  slug: string;
  name: string;
  promptContent: string;
  modelId: string;
  modelProvider: string;
  modelDisplayName: string;
  apiConfig: {
    temperature?: number;
    max_tokens?: number;
    [key: string]: unknown;
  };
}

/**
 * Load the active prompt configuration for a given slug
 */
export async function loadActivePromptConfig(slug: string): Promise<PromptConfig> {
  const supabase = getSupabaseAdmin();

  // Get prompt set with current version and model
  // Note: Using !prompt_versions_prompt_set_id_fkey to specify the relationship
  // (there are two FKs: prompt_versions.prompt_set_id and prompt_sets.current_version_id)
  const { data, error } = await supabase
    .from("prompt_sets")
    .select(`
      id,
      slug,
      name,
      prompt_versions!prompt_versions_prompt_set_id_fkey (
        id,
        prompt_content,
        api_config,
        model_id,
        ai_models!prompt_versions_model_id_fkey (
          model_id,
          provider,
          display_name
        )
      )
    `)
    .eq("slug", slug)
    .eq("prompt_versions.status", "active")
    .single();

  if (error) {
    throw new Error(`Failed to load prompt config for '${slug}': ${error.message}`);
  }

  if (!data || !data.prompt_versions || data.prompt_versions.length === 0) {
    throw new Error(`No active prompt version found for '${slug}'`);
  }

  const version = data.prompt_versions[0];
  const model = version.ai_models;

  return {
    promptSetId: data.id,
    promptVersionId: version.id,
    slug: data.slug,
    name: data.name,
    promptContent: version.prompt_content,
    modelId: model?.model_id || "anthropic/claude-sonnet-4-5",
    modelProvider: model?.provider || "anthropic",
    modelDisplayName: model?.display_name || "Claude Sonnet 4.5",
    apiConfig: version.api_config || {},
  };
}

/**
 * Interpolate template variables in prompt content
 *
 * Supports {{variable_name}} syntax
 */
export function interpolateTemplate(
  template: string,
  variables: Record<string, string | undefined>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key];
    return value !== undefined ? value : match;
  });
}

/**
 * Build a complete prompt from config and variables
 */
export function buildPrompt(
  config: PromptConfig,
  variables: Record<string, string | undefined>
): string {
  return interpolateTemplate(config.promptContent, variables);
}
