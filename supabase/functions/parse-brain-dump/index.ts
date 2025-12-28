/**
 * Parse Brain Dump Edge Function
 *
 * Extracts themes, insights, and potential angles from raw brain dump text.
 * Uses the brain_dump_parser prompt from the database.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getSupabaseClient, getSupabaseAdmin, getAuthenticatedUser } from "../_shared/supabase.ts";
import { loadActivePromptConfig, interpolateTemplate, buildPrompt } from "../_shared/prompts.ts";
import { callAI, parseJSONResponse } from "../_shared/ai.ts";

interface BrainDumpRequest {
  content: string;
  session_id?: string;
}

interface ExtractedTheme {
  theme: string;
  description: string;
  potential_angles: string[];
  related_topics: string[];
}

interface BrainDumpResult {
  themes: ExtractedTheme[];
  key_insights: string[];
  suggested_research_queries: string[];
  overall_direction: string;
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
    const { content, session_id } = (await req.json()) as BrainDumpRequest;

    if (!content || content.trim().length === 0) {
      return errorResponse("Brain dump content is required", 400);
    }

    // Load prompt configuration from database
    const promptConfig = await loadActivePromptConfig("brain_dump_parser");

    // Get user's voice guidelines (if they exist)
    const adminSupabase = getSupabaseAdmin();
    const { data: voiceGuidelines } = await adminSupabase
      .from("voice_guidelines")
      .select("content")
      .eq("user_id", user.id)
      .single();

    // Build the system prompt with interpolated variables
    const systemPrompt = buildPrompt(promptConfig, {
      voice_guidelines: voiceGuidelines?.content || "No specific voice guidelines set.",
    });

    // Call AI
    const result = await callAI({
      promptConfig,
      systemPrompt,
      userPrompt: content,
      sessionId: session_id,
    });

    // Parse the AI response as JSON
    const parsedResult = parseJSONResponse<BrainDumpResult>(result.content);

    // If we have a session_id, save the brain dump to the database
    if (session_id) {
      await adminSupabase.from("content_brain_dumps").insert({
        session_id,
        raw_content: content,
        extracted_themes: parsedResult,
      });
    }

    return jsonResponse({
      success: true,
      result: parsedResult,
      tokens: {
        input: result.tokensIn,
        output: result.tokensOut,
      },
    });
  } catch (error) {
    console.error("Parse brain dump error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to parse brain dump",
      500
    );
  }
});
