/**
 * Generate Image Edge Function
 *
 * Takes a prompt and generates an image using the configured AI model.
 * Uses Vercel AI SDK with createGateway for model access.
 * Uses database-driven settings for model selection.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getSupabaseClient, getSupabaseAdmin, getAuthenticatedUser } from "../_shared/supabase.ts";
import { EdgeFunctionSettings } from "../_shared/settings.ts";
import { generateText, createGateway } from "https://esm.sh/ai@5.0.80";

// Get gateway API key
const GATEWAY_API_KEY = Deno.env.get("VERCEL_AI_GATEWAY_API_KEY");

if (!GATEWAY_API_KEY) {
  console.warn("[generate-image] VERCEL_AI_GATEWAY_API_KEY is not set");
}

// Create gateway instance
const gateway = createGateway({
  apiKey: GATEWAY_API_KEY,
});

interface ImageRequest {
  prompt: string;
  negative_prompt?: string;
  aspect_ratio?: string; // e.g., "1:1", "16:9", "1200:630"
  session_id?: string;
}

interface ImageResult {
  image_url?: string;
  image_base64?: string;
  model_used: string;
  revised_prompt?: string;
  mime_type?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Get authenticated user
    const authHeader = req.headers.get("authorization");
    const supabase = getSupabaseClient(authHeader ?? undefined);
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    // Parse request body
    const {
      prompt,
      negative_prompt,
      aspect_ratio = "16:9",
      session_id,
    } = (await req.json()) as ImageRequest;

    if (!prompt || prompt.trim().length === 0) {
      return errorResponse("Prompt is required", 400);
    }

    // Get settings from database (Rule 1: No Hardcoded Values)
    const settings = await EdgeFunctionSettings.imageGenerator();

    if (!GATEWAY_API_KEY) {
      throw new Error("VERCEL_AI_GATEWAY_API_KEY not configured");
    }

    const startTime = Date.now();
    let result: ImageResult;
    let modelUsed = settings.model;

    // Build the full prompt with negative prompt if provided
    const fullPrompt = negative_prompt
      ? `${prompt}\n\nAvoid: ${negative_prompt}`
      : prompt;

    // Convert aspect ratio format (e.g., "1200:630" -> "16:9")
    const normalizedAspectRatio = normalizeAspectRatio(aspect_ratio);

    console.log(`[generate-image] Model: ${settings.model}`);
    console.log(`[generate-image] Aspect ratio: ${aspect_ratio} -> ${normalizedAspectRatio}`);
    console.log(`[generate-image] Prompt length: ${fullPrompt.length}`);

    // Try primary model first
    try {
      result = await generateWithModel(
        settings.model,
        fullPrompt,
        normalizedAspectRatio
      );
      result.model_used = settings.model;
    } catch (primaryError) {
      console.warn(`Primary model ${settings.model} failed:`, primaryError);

      // Fall back to secondary model
      if (settings.fallbackModel) {
        console.log(`Falling back to ${settings.fallbackModel}`);
        result = await generateWithModel(
          settings.fallbackModel,
          fullPrompt,
          normalizedAspectRatio
        );
        result.model_used = settings.fallbackModel;
        modelUsed = settings.fallbackModel;
      } else {
        throw primaryError;
      }
    }

    const durationMs = Date.now() - startTime;
    console.log(`[generate-image] Generation completed in ${durationMs}ms`);

    // Log the generation
    const adminSupabase = getSupabaseAdmin();
    await adminSupabase.from("ai_call_logs").insert({
      session_id: session_id || null,
      prompt_set_slug: "image_generator",
      full_prompt: fullPrompt,
      full_response: "[base64 image]",
      model_id: modelUsed,
      tokens_in: null,
      tokens_out: null,
      duration_ms: durationMs,
    });

    // Save to database if session_id provided
    if (session_id) {
      await adminSupabase.from("generated_images").upsert({
        session_id,
        prompt,
        image_url: result.image_url,
        image_base64: result.image_base64,
        model_used: modelUsed,
        aspect_ratio,
      });
    }

    return jsonResponse({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Generate image error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to generate image",
      500
    );
  }
});

/**
 * Generate image with a specific model using Vercel AI SDK
 */
async function generateWithModel(
  modelId: string,
  prompt: string,
  aspectRatio: string
): Promise<ImageResult> {
  console.log(`[generate-image] Calling model: ${modelId}`);

  // Build provider options based on model type
  const providerOptions: Record<string, any> = {};

  // Gemini models (Google)
  if (modelId.includes("gemini") || modelId.includes("google")) {
    providerOptions.google = {
      imageConfig: {
        aspectRatio: aspectRatio,
      },
    };
  }

  // FLUX models (Black Forest Labs)
  if (modelId.includes("flux") || modelId.includes("bfl")) {
    const dimensions = getBflDimensions(aspectRatio);
    providerOptions.bfl = {
      width: dimensions.width,
      height: dimensions.height,
    };
  }

  // Call generateText (Gemini image models use this, not generateImage)
  const result = await generateText({
    model: gateway(modelId),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
    providerOptions,
  });

  console.log(`[generate-image] Response received`);
  console.log(`[generate-image] Files count: ${result.files?.length ?? 0}`);
  console.log(`[generate-image] Text response length: ${result.text?.length ?? 0}`);

  // Extract image from result.files
  const imageFile = result.files?.find(
    (file: any) => file.mediaType?.startsWith("image/")
  );

  if (!imageFile) {
    console.warn(`[generate-image] No image in response. Text: ${result.text?.substring(0, 500)}`);
    throw new Error(
      "No image generated by the model. The model may not support image generation or the prompt was rejected."
    );
  }

  console.log(`[generate-image] Image generated successfully`);
  console.log(`[generate-image] Media type: ${imageFile.mediaType}`);

  return {
    image_base64: imageFile.base64,
    mime_type: imageFile.mediaType,
    model_used: modelId,
  };
}

/**
 * Normalize aspect ratio to standard format for AI models
 */
function normalizeAspectRatio(aspectRatio: string): string {
  // Map common custom formats to standard ratios
  const ratioMap: Record<string, string> = {
    "1200:630": "16:9",  // Substack header
    "1280:720": "16:9",  // YouTube thumbnail
    "1920:1080": "16:9", // Full HD
    "1080:1920": "9:16", // Vertical video
    "1080:1080": "1:1",  // Square
    "1024:1024": "1:1",
    "1792:1024": "16:9",
    "1024:1792": "9:16",
  };

  return ratioMap[aspectRatio] || aspectRatio;
}

/**
 * Get BFL (FLUX) dimensions for aspect ratio
 */
function getBflDimensions(aspectRatio: string): { width: number; height: number } {
  const dimensionMap: Record<string, { width: number; height: number }> = {
    "16:9": { width: 1920, height: 1080 },
    "9:16": { width: 1080, height: 1920 },
    "1:1": { width: 1024, height: 1024 },
    "4:3": { width: 1536, height: 1024 },
    "3:4": { width: 1024, height: 1536 },
    "wide": { width: 1920, height: 1080 },
    "landscape": { width: 1536, height: 1024 },
    "portrait": { width: 1024, height: 1536 },
    "square": { width: 1024, height: 1024 },
  };

  return dimensionMap[aspectRatio] || { width: 1920, height: 1080 };
}
