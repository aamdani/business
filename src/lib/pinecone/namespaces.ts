/**
 * Pinecone Namespace Loader
 *
 * Loads namespace configuration from the database with caching.
 * Namespaces rarely change, so we cache for 60 seconds.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type { PineconeNamespace } from "@/lib/types";

// Cache for namespace data (60 second TTL)
interface NamespaceCache {
  data: PineconeNamespace[];
  timestamp: number;
}

let namespaceCache: NamespaceCache | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Well-known namespace slugs
 * These match the seed data in the pinecone_namespaces table
 */
export const NAMESPACE_SLUGS = {
  JON: "jon",
  NATE: "nate",
  RESEARCH: "research",
  OFFICIAL_DOCS: "official-docs",
} as const;

/**
 * Get all active namespaces from the database
 * Results are cached for 60 seconds
 */
export async function getNamespaces(
  supabase: SupabaseClient
): Promise<PineconeNamespace[]> {
  // Return cached data if still valid
  if (namespaceCache && Date.now() - namespaceCache.timestamp < CACHE_TTL_MS) {
    return namespaceCache.data;
  }

  const { data, error } = await supabase
    .from("pinecone_namespaces")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  if (error) {
    console.error("Failed to load namespaces:", error);
    // Return cached data if available, even if stale
    if (namespaceCache) {
      return namespaceCache.data;
    }
    throw error;
  }

  // Update cache
  namespaceCache = {
    data: data || [],
    timestamp: Date.now(),
  };

  return namespaceCache.data;
}

/**
 * Get searchable namespaces (for semantic search)
 */
export async function getSearchableNamespaces(
  supabase: SupabaseClient
): Promise<PineconeNamespace[]> {
  const namespaces = await getNamespaces(supabase);
  return namespaces.filter((ns) => ns.is_searchable);
}

/**
 * Get a namespace by slug
 */
export async function getNamespaceBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<PineconeNamespace | null> {
  const namespaces = await getNamespaces(supabase);
  return namespaces.find((ns) => ns.slug === slug) || null;
}

/**
 * Get namespaces by source type
 */
export async function getNamespacesBySourceType(
  supabase: SupabaseClient,
  sourceType: string
): Promise<PineconeNamespace[]> {
  const namespaces = await getNamespaces(supabase);
  return namespaces.filter((ns) => ns.source_type === sourceType);
}

/**
 * Clear the namespace cache (call after updates)
 */
export function clearNamespaceCache(): void {
  namespaceCache = null;
}

/**
 * Mapping helper: convert source identifier to namespace slug
 *
 * This helps with migration from old hardcoded values.
 * Old values like "jon-substack" map to new "jon" namespace.
 */
export function normalizeNamespaceSlug(source: string): string {
  // Map old format to new format
  const mappings: Record<string, string> = {
    "jon-substack": "jon",
    "nate-substack": "nate",
    jon_substack: "jon",
    nate_substack: "nate",
    "content-hub-posts": "jon", // Legacy namespace
    "content-hub-research": "research",
    "content-hub-brain-dumps": "research", // Map to research for now
  };

  // Check if we have a mapping
  const normalized = source.toLowerCase().trim();
  if (mappings[normalized]) {
    return mappings[normalized];
  }

  // If source contains "jon", use "jon" namespace
  if (normalized.includes("jon")) {
    return "jon";
  }

  // If source contains "nate", use "nate" namespace
  if (normalized.includes("nate")) {
    return "nate";
  }

  // Return as-is if no mapping found
  return source;
}

/**
 * Get namespace slug for a given source (jon/nate)
 * Used by sync routes and import scripts
 */
export function getNamespaceSlugForSource(source: "jon" | "nate"): string {
  return source; // Direct mapping now that we use clean names
}

/**
 * Map a source identifier to its namespace slug
 * Handles various source formats (jon, jon-substack, etc.)
 * Used by sync routes to determine which Pinecone namespace to use
 */
export function mapSourceToNamespaceSlug(source: string): string {
  const normalized = source.toLowerCase().trim();

  if (normalized.includes("jon")) {
    return NAMESPACE_SLUGS.JON;
  }
  if (normalized.includes("nate")) {
    return NAMESPACE_SLUGS.NATE;
  }

  // Return as-is if no mapping found
  return source;
}

/**
 * Get all namespace slugs as an array
 * Useful for scripts that need to iterate over namespaces
 */
export async function getAllNamespaceSlugs(
  supabase: SupabaseClient
): Promise<string[]> {
  const namespaces = await getNamespaces(supabase);
  return namespaces.map((ns) => ns.slug);
}
