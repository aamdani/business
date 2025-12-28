import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

// Known model metadata
const MODEL_METADATA: Record<string, { display_name: string; supports_images?: boolean; context_window?: number }> = {
  "anthropic/claude-sonnet-4-5": { display_name: "Claude Sonnet 4.5", context_window: 200000 },
  "anthropic/claude-haiku-4-5": { display_name: "Claude Haiku 4.5", context_window: 200000 },
  "anthropic/claude-opus-4-5": { display_name: "Claude Opus 4.5", context_window: 200000 },
  "google/gemini-3-pro-image": { display_name: "Gemini 3 Pro Image (Nano Banana Pro)", supports_images: true },
  "google/imagen-4.0-generate": { display_name: "Imagen 4.0 Generate", supports_images: true },
  "openai/dall-e-3": { display_name: "DALL·E 3", supports_images: true },
  "bfl/flux-2-pro": { display_name: "FLUX 2 Pro", supports_images: true },
};

function extractProvider(modelId: string): string {
  return modelId.split("/")[0] || "unknown";
}

function generateDisplayName(modelId: string): string {
  const parts = modelId.split("/");
  if (parts.length < 2) return modelId;
  return parts[1]
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function POST() {
  try {
    // Check auth and admin role
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Fetch models from Vercel AI Gateway
    const apiKey = process.env.VERCEL_AI_GATEWAY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "VERCEL_AI_GATEWAY_API_KEY not configured" }, { status: 500 });
    }

    const response = await fetch(AI_GATEWAY_MODELS_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Gateway API error: ${response.status}` },
        { status: 502 }
      );
    }

    const gatewayData = (await response.json()) as GatewayResponse;

    // Get existing models
    const { data: existingModels } = await supabase
      .from("ai_models")
      .select("model_id");

    const existingIds = new Set(existingModels?.map((m) => m.model_id) || []);

    // Transform and filter new models
    const newModels = gatewayData.data
      .filter((m) => !existingIds.has(m.id))
      .map((m) => {
        const metadata = MODEL_METADATA[m.id] || {};
        return {
          model_id: m.id,
          provider: extractProvider(m.id),
          display_name: metadata.display_name || generateDisplayName(m.id),
          context_window: metadata.context_window || null,
          supports_images: metadata.supports_images || false,
          supports_streaming: !(metadata.supports_images || false), // Image models typically don't stream
          is_available: true,
        };
      });

    // Insert new models
    if (newModels.length > 0) {
      const { error: insertError } = await supabase.from("ai_models").insert(newModels);

      if (insertError) {
        return NextResponse.json(
          { error: `Failed to insert models: ${insertError.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      totalFromApi: gatewayData.data.length,
      existingCount: existingIds.size,
      newModelsAdded: newModels.length,
      newModels: newModels.map((m) => m.model_id),
    });
  } catch (error) {
    console.error("Model sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}
