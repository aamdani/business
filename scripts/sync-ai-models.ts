/**
 * AI Model Sync Script
 *
 * Fetches the current list of available models from Vercel AI Gateway
 * and updates the database to keep model information current.
 *
 * Usage:
 *   npx tsx scripts/sync-ai-models.ts
 *   npx tsx scripts/sync-ai-models.ts --dry-run
 *
 * Can also be run as a scheduled job or triggered from admin UI.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import * as path from "path";

// Load environment variables
config({ path: path.join(__dirname, "..", ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const VERCEL_AI_GATEWAY_API_KEY = process.env.VERCEL_AI_GATEWAY_API_KEY!;

const AI_GATEWAY_MODELS_URL = "https://ai-gateway.vercel.sh/v1/models";

interface GatewayModel {
  id: string;
  object: string;
  created?: number;
  owned_by?: string;
}

interface GatewayResponse {
  object: string;
  data: GatewayModel[];
}

interface ModelInfo {
  model_id: string;
  provider: string;
  display_name: string;
  context_window: number | null;
  max_output_tokens: number | null;
  supports_images: boolean;
  supports_streaming: boolean;
  is_available: boolean;
}

// Known model metadata that isn't available from the API
const MODEL_METADATA: Record<string, Partial<ModelInfo>> = {
  // Anthropic models
  "anthropic/claude-sonnet-4-5": {
    display_name: "Claude Sonnet 4.5",
    context_window: 200000,
    max_output_tokens: 64000,
    supports_streaming: true,
  },
  "anthropic/claude-haiku-4-5": {
    display_name: "Claude Haiku 4.5",
    context_window: 200000,
    max_output_tokens: 64000,
    supports_streaming: true,
  },
  "anthropic/claude-opus-4-5": {
    display_name: "Claude Opus 4.5",
    context_window: 200000,
    max_output_tokens: 64000,
    supports_streaming: true,
  },
  // Perplexity
  "perplexity/sonar-pro": {
    display_name: "Perplexity Sonar Pro",
    context_window: 200000,
    supports_streaming: true,
  },
  // Google text models
  "google/gemini-2.0-flash": {
    display_name: "Gemini 2.0 Flash",
    context_window: 1000000,
    supports_streaming: true,
  },
  "google/gemini-3-pro-image": {
    display_name: "Gemini 3 Pro Image (Nano Banana Pro)",
    supports_images: true,
    supports_streaming: false,
  },
  // Google Imagen
  "google/imagen-4.0-generate": {
    display_name: "Imagen 4.0 Generate",
    supports_images: true,
    supports_streaming: false,
  },
  "google/imagen-4.0-fast-generate": {
    display_name: "Imagen 4.0 Fast Generate",
    supports_images: true,
    supports_streaming: false,
  },
  "google/imagen-4.0-ultra-generate": {
    display_name: "Imagen 4.0 Ultra Generate",
    supports_images: true,
    supports_streaming: false,
  },
  // OpenAI
  "openai/dall-e-3": {
    display_name: "DALL·E 3",
    supports_images: true,
    supports_streaming: false,
  },
  "openai/dall-e-2": {
    display_name: "DALL·E 2",
    supports_images: true,
    supports_streaming: false,
  },
  // Black Forest Labs FLUX
  "bfl/flux-2-pro": {
    display_name: "FLUX 2 Pro",
    supports_images: true,
    supports_streaming: false,
  },
  "bfl/flux-2-flex": {
    display_name: "FLUX 2 Flex",
    supports_images: true,
    supports_streaming: false,
  },
  "bfl/flux-pro-1.1-ultra": {
    display_name: "FLUX 1.1 Pro Ultra",
    supports_images: true,
    supports_streaming: false,
  },
  "bfl/flux-pro-1.1": {
    display_name: "FLUX 1.1 Pro",
    supports_images: true,
    supports_streaming: false,
  },
  "bfl/flux-kontext-pro": {
    display_name: "FLUX Kontext Pro",
    supports_images: true,
    supports_streaming: false,
  },
  "bfl/flux-kontext-max": {
    display_name: "FLUX Kontext Max",
    supports_images: true,
    supports_streaming: false,
  },
};

// Extract provider from model ID (e.g., "anthropic/claude-sonnet-4-5" -> "anthropic")
function extractProvider(modelId: string): string {
  const parts = modelId.split("/");
  return parts[0] || "unknown";
}

// Generate a display name from model ID
function generateDisplayName(modelId: string): string {
  const parts = modelId.split("/");
  if (parts.length < 2) return modelId;

  // Convert "claude-sonnet-4-5" to "Claude Sonnet 4 5"
  return parts[1]
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Parse command line arguments
function parseArgs(): { dryRun: boolean } {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
  };
}

async function fetchModels(): Promise<GatewayModel[]> {
  console.log("📡 Fetching models from Vercel AI Gateway...");

  const response = await fetch(AI_GATEWAY_MODELS_URL, {
    headers: {
      Authorization: `Bearer ${VERCEL_AI_GATEWAY_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as GatewayResponse;
  console.log(`   Found ${data.data.length} models`);
  return data.data;
}

function transformModel(gatewayModel: GatewayModel): ModelInfo {
  const modelId = gatewayModel.id;
  const provider = extractProvider(modelId);
  const metadata = MODEL_METADATA[modelId] || {};

  return {
    model_id: modelId,
    provider,
    display_name: metadata.display_name || generateDisplayName(modelId),
    context_window: metadata.context_window || null,
    max_output_tokens: metadata.max_output_tokens || null,
    supports_images: metadata.supports_images || false,
    supports_streaming: metadata.supports_streaming ?? true,
    is_available: true,
  };
}

async function syncModels(dryRun: boolean) {
  console.log(`\n🔄 AI Model Sync ${dryRun ? "(DRY RUN)" : ""}\n`);

  // Fetch models from Vercel AI Gateway
  const gatewayModels = await fetchModels();

  // Transform to our format
  const models = gatewayModels.map(transformModel);

  if (dryRun) {
    console.log("\n📋 Models that would be synced:\n");
    models.slice(0, 20).forEach((m) => {
      console.log(`  - ${m.model_id} (${m.display_name})`);
    });
    if (models.length > 20) {
      console.log(`  ... and ${models.length - 20} more`);
    }
    return;
  }

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Get existing models
  const { data: existingModels, error: fetchError } = await supabase
    .from("ai_models")
    .select("model_id");

  if (fetchError) {
    throw new Error(`Failed to fetch existing models: ${fetchError.message}`);
  }

  const existingIds = new Set(existingModels?.map((m) => m.model_id) || []);

  // Find new models
  const newModels = models.filter((m) => !existingIds.has(m.model_id));

  console.log(`\n📊 Sync Summary:`);
  console.log(`   Total from API: ${models.length}`);
  console.log(`   Already in DB: ${existingIds.size}`);
  console.log(`   New to add: ${newModels.length}`);

  if (newModels.length === 0) {
    console.log("\n✅ Database is already up to date!");
    return;
  }

  // Insert new models
  console.log("\n⏳ Adding new models...");
  const { error: insertError } = await supabase.from("ai_models").insert(newModels);

  if (insertError) {
    throw new Error(`Failed to insert models: ${insertError.message}`);
  }

  console.log(`\n✅ Successfully added ${newModels.length} new models:`);
  newModels.forEach((m) => {
    console.log(`   + ${m.model_id}`);
  });

  // Mark models not in API as unavailable (optional)
  const apiIds = new Set(models.map((m) => m.model_id));
  const toMarkUnavailable = [...existingIds].filter((id) => !apiIds.has(id));

  if (toMarkUnavailable.length > 0) {
    console.log(`\n⚠️  ${toMarkUnavailable.length} models in DB not found in API (keeping as-is)`);
    // Optionally mark as unavailable:
    // await supabase.from('ai_models').update({ is_available: false }).in('model_id', toMarkUnavailable);
  }
}

// Run
const { dryRun } = parseArgs();
syncModels(dryRun).catch(console.error);
