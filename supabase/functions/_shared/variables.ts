/**
 * Automatic Variable Resolution System
 *
 * Resolves prompt variables from database using session_id.
 * Variables are defined in the prompt_variables registry table.
 *
 * Convention: {source}_{description}_{creator}
 * - source: Pipeline stage (brain_dump, research, outline, etc.)
 * - description: What the data represents
 * - creator: user, ai, or system
 */

import { getSupabaseAdmin } from "./supabase.ts";

export interface PromptVariable {
  id: string;
  variable_name: string;
  display_name: string;
  description: string | null;
  source_table: string;
  source_column: string;
  available_after_stage: string;
  creator: "user" | "ai" | "system";
  category: string;
  is_json_path: boolean;
  json_transform: string | null;
  fallback_value: string | null;
  sort_order: number;
  is_active: boolean;
}

/**
 * Extract variable names from a prompt template
 * Finds all {{variable_name}} patterns
 */
export function extractVariables(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.slice(2, -2)))];
}

/**
 * Load variable definitions from the registry
 */
export async function loadVariableDefinitions(
  variableNames: string[]
): Promise<Map<string, PromptVariable>> {
  if (variableNames.length === 0) return new Map();

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("prompt_variables")
    .select("*")
    .in("variable_name", variableNames)
    .eq("is_active", true);

  if (error) {
    console.error("Failed to load variable definitions:", error);
    return new Map();
  }

  const map = new Map<string, PromptVariable>();
  for (const v of data || []) {
    map.set(v.variable_name, v);
  }
  return map;
}

/**
 * Get value from nested JSON path
 * Supports paths like "extracted_themes.key_insights" or "outline_json.title"
 */
function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;

  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Apply JSON transformation to a value
 */
function applyTransform(value: unknown, transform: string | null): string {
  if (value === null || value === undefined) return "";

  switch (transform) {
    case "stringify":
      return typeof value === "string" ? value : JSON.stringify(value, null, 2);

    case "array_join":
      if (Array.isArray(value)) {
        return value.map((v) => (typeof v === "string" ? v : JSON.stringify(v))).join("\n");
      }
      return String(value);

    case "array_pluck_theme":
      if (Array.isArray(value)) {
        return value.map((v) => v?.theme || "").filter(Boolean).join("\n");
      }
      return "";

    case "array_pluck_description":
      if (Array.isArray(value)) {
        return value.map((v) => v?.description || "").filter(Boolean).join("\n\n");
      }
      return "";

    case "array_pluck_potential_angles":
      if (Array.isArray(value)) {
        return value
          .map((v) => (v?.potential_angles || []).join(", "))
          .filter(Boolean)
          .join("\n");
      }
      return "";

    case "array_pluck_related_topics":
      if (Array.isArray(value)) {
        return value
          .map((v) => (v?.related_topics || []).join(", "))
          .filter(Boolean)
          .join("\n");
      }
      return "";

    default:
      if (typeof value === "string") return value;
      if (typeof value === "number" || typeof value === "boolean") return String(value);
      return JSON.stringify(value);
  }
}

/**
 * Fetch session data from all content tables
 */
async function fetchSessionData(
  sessionId: string,
  userId: string
): Promise<{
  session: Record<string, unknown> | null;
  brain_dump: Record<string, unknown> | null;
  research: Record<string, unknown> | null;
  outline: Record<string, unknown> | null;
  draft: Record<string, unknown> | null;
  profile: Record<string, unknown> | null;
}> {
  const supabase = getSupabaseAdmin();

  // Fetch all content data in parallel
  const [sessionRes, brainDumpRes, researchRes, outlineRes, draftRes, profileRes] =
    await Promise.all([
      supabase
        .from("content_sessions")
        .select("*")
        .eq("id", sessionId)
        .single(),

      supabase
        .from("content_brain_dumps")
        .select("*")
        .eq("session_id", sessionId)
        .single(),

      supabase
        .from("content_research")
        .select("*")
        .eq("session_id", sessionId)
        .single(),

      supabase
        .from("content_outlines")
        .select("*")
        .eq("session_id", sessionId)
        .eq("selected", true)
        .single(),

      supabase
        .from("content_drafts")
        .select("*")
        .eq("session_id", sessionId)
        .order("version", { ascending: false })
        .limit(1)
        .single(),

      supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single(),
    ]);

  return {
    session: sessionRes.data,
    brain_dump: brainDumpRes.data,
    research: researchRes.data,
    outline: outlineRes.data,
    draft: draftRes.data,
    profile: profileRes.data,
  };
}

/**
 * Fetch brand guidelines for a user
 */
async function fetchGuidelines(
  userId: string,
  category: string
): Promise<string> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("brand_guidelines")
    .select("content")
    .eq("user_id", userId)
    .eq("category", category)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) return "";

  return data.map((g) => `- ${g.content}`).join("\n");
}

/**
 * Map source_table to the data object key
 */
function getTableData(
  sourceTable: string,
  sessionData: Awaited<ReturnType<typeof fetchSessionData>>
): Record<string, unknown> | null {
  const tableMap: Record<string, keyof typeof sessionData> = {
    content_sessions: "session",
    content_brain_dumps: "brain_dump",
    content_research: "research",
    content_outlines: "outline",
    content_drafts: "draft",
    profiles: "profile",
  };

  const key = tableMap[sourceTable];
  if (key) {
    return sessionData[key] as Record<string, unknown> | null;
  }
  return null;
}

/**
 * Resolve a single variable from session data
 */
async function resolveVariable(
  variable: PromptVariable,
  sessionData: Awaited<ReturnType<typeof fetchSessionData>>,
  userId: string
): Promise<string> {
  // Handle special computed variables
  if (variable.source_table === "computed") {
    // TODO: Implement semantic search for cross_references
    return variable.fallback_value || "";
  }

  // Handle brand guidelines (special category filter)
  if (variable.source_table === "brand_guidelines") {
    const categoryMatch = variable.json_transform?.match(/category_filter:(\w+)/);
    if (categoryMatch) {
      const guidelineContent = await fetchGuidelines(userId, categoryMatch[1]);
      return guidelineContent || variable.fallback_value || "";
    }
  }

  // Handle destination computed requirements
  if (variable.source_table === "destinations" && variable.source_column === "computed") {
    // TODO: Implement destination requirements assembly
    return variable.fallback_value || "";
  }

  // Get the data for this table
  const tableData = getTableData(variable.source_table, sessionData);
  if (!tableData) {
    return variable.fallback_value || "";
  }

  // Get the value
  let value: unknown;
  if (variable.is_json_path || variable.source_column.includes(".")) {
    value = getNestedValue(tableData, variable.source_column);
  } else {
    value = tableData[variable.source_column];
  }

  // Apply transformation
  const result = applyTransform(value, variable.json_transform);

  // Return result or fallback
  return result || variable.fallback_value || "";
}

/**
 * Main function: Resolve all variables for a prompt template
 *
 * @param template - The prompt template with {{variable_name}} placeholders
 * @param sessionId - The content session ID
 * @param userId - The user ID
 * @param overrides - Optional manual overrides (for backward compatibility)
 * @returns Record of variable_name -> resolved_value
 */
export async function resolveVariables(
  template: string,
  sessionId: string,
  userId: string,
  overrides?: Record<string, string>
): Promise<Record<string, string>> {
  // Extract variable names from template
  const variableNames = extractVariables(template);

  if (variableNames.length === 0) {
    return {};
  }

  // Load variable definitions
  const definitions = await loadVariableDefinitions(variableNames);

  // Fetch session data once
  const sessionData = await fetchSessionData(sessionId, userId);

  // Resolve each variable
  const resolved: Record<string, string> = {};

  for (const varName of variableNames) {
    // Check for manual override first
    if (overrides && varName in overrides) {
      resolved[varName] = overrides[varName];
      continue;
    }

    // Get definition
    const definition = definitions.get(varName);
    if (!definition) {
      // Unknown variable - leave placeholder or use empty string
      console.warn(`Unknown variable: {{${varName}}}`);
      resolved[varName] = "";
      continue;
    }

    // Resolve from database
    resolved[varName] = await resolveVariable(definition, sessionData, userId);
  }

  return resolved;
}

/**
 * Get available variables for a given pipeline stage
 * Used by Prompt Studio to show which variables can be used
 */
export async function getAvailableVariables(
  stage: string
): Promise<PromptVariable[]> {
  const supabase = getSupabaseAdmin();

  // Define stage order for filtering
  const stageOrder: Record<string, number> = {
    create: 1,
    research: 2,
    outline: 3,
    draft: 4,
    voice: 5,
    outputs: 6,
  };

  const currentStageOrder = stageOrder[stage] || 0;

  const { data, error } = await supabase
    .from("prompt_variables")
    .select("*")
    .eq("is_active", true)
    .order("category")
    .order("sort_order");

  if (error || !data) {
    console.error("Failed to load available variables:", error);
    return [];
  }

  // Filter to variables available at or before this stage
  return data.filter((v) => {
    if (v.available_after_stage === "all") return true;
    const varStageOrder = stageOrder[v.available_after_stage] || 0;
    return varStageOrder <= currentStageOrder;
  });
}

/**
 * Validate that a prompt only uses variables available at its stage
 * Returns array of invalid variable names
 */
export async function validatePromptVariables(
  template: string,
  promptStage: string
): Promise<string[]> {
  const variableNames = extractVariables(template);
  const availableVars = await getAvailableVariables(promptStage);
  const availableNames = new Set(availableVars.map((v) => v.variable_name));

  return variableNames.filter((name) => !availableNames.has(name));
}

/**
 * Resolve ONLY the variables selected for a specific prompt
 * This is the user-controlled variable resolution system.
 *
 * @param promptSetId - The prompt set ID
 * @param sessionId - The content session ID
 * @param userId - The user ID
 * @param overrides - Optional manual overrides (for runtime input)
 * @returns Record of variable_name -> resolved_value (only selected variables)
 */
export async function resolveSelectedVariables(
  promptSetId: string,
  sessionId: string,
  userId: string,
  overrides?: Record<string, string>
): Promise<Record<string, string>> {
  const supabase = getSupabaseAdmin();

  // 1. Load selected variables for this prompt
  const { data: selections, error: selectionsError } = await supabase
    .from("prompt_variable_selections")
    .select(`
      variable_id,
      prompt_variables (
        id,
        variable_name,
        display_name,
        description,
        source_table,
        source_column,
        available_after_stage,
        creator,
        category,
        is_json_path,
        json_transform,
        fallback_value,
        sort_order,
        is_active
      )
    `)
    .eq("prompt_set_id", promptSetId)
    .eq("is_selected", true);

  if (selectionsError) {
    console.error("Failed to load variable selections:", selectionsError);
    return {};
  }

  // Extract the variable definitions
  const selectedVars: PromptVariable[] = (selections || [])
    .map((s) => s.prompt_variables)
    .filter((v): v is PromptVariable => v !== null && v.is_active);

  if (selectedVars.length === 0) {
    return {};
  }

  // 2. Fetch session data
  const sessionData = await fetchSessionData(sessionId, userId);

  // 3. Resolve each selected variable
  const resolved: Record<string, string> = {};

  for (const variable of selectedVars) {
    // Check for manual override first (runtime input takes precedence)
    if (overrides && variable.variable_name in overrides) {
      resolved[variable.variable_name] = overrides[variable.variable_name];
      continue;
    }

    // Resolve from database
    resolved[variable.variable_name] = await resolveVariable(
      variable,
      sessionData,
      userId
    );
  }

  return resolved;
}
