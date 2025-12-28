/**
 * Generate Outlines Edge Function
 *
 * Creates detailed outline options based on themes and research.
 * Returns one outline at a time with ability to regenerate with modifications.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getSupabaseClient, getSupabaseAdmin, getAuthenticatedUser } from "../_shared/supabase.ts";
import { loadActivePromptConfig, buildPrompt } from "../_shared/prompts.ts";
import { callAI, parseJSONResponse } from "../_shared/ai.ts";

interface OutlineRequest {
  theme: string;
  description?: string;
  research_summary?: string;
  key_points?: string[];
  user_input?: string; // Additional user modifications/preferences
  session_id?: string;
}

interface OutlineSection {
  title: string;
  key_points: string[];
  estimated_words: number;
  hook?: string;
}

interface Outline {
  title: string;
  subtitle: string;
  hook: string;
  target_audience: string;
  main_argument: string;
  sections: OutlineSection[];
  conclusion_approach: string;
  call_to_action?: string;
  estimated_total_words: number;
  tone_notes: string;
}

interface OutlineResponse {
  outline: Outline;
  summary: string;
  alternative_angles: string[];
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
      theme,
      description,
      research_summary,
      key_points,
      user_input,
      session_id,
    } = (await req.json()) as OutlineRequest;

    if (!theme || theme.trim().length === 0) {
      return errorResponse("Theme is required", 400);
    }

    // Load prompt configuration
    const promptConfig = await loadActivePromptConfig("outline_generator");

    // Get user's voice guidelines
    const adminSupabase = getSupabaseAdmin();
    const { data: voiceGuidelines } = await adminSupabase
      .from("voice_guidelines")
      .select("content")
      .eq("user_id", user.id)
      .single();

    // Build the system prompt
    const systemPrompt = buildPrompt(promptConfig, {
      voice_guidelines: voiceGuidelines?.content || "No specific voice guidelines set.",
    });

    // Build user message with all context
    const userMessage = `
Theme: ${theme}
${description ? `Description: ${description}` : ""}
${research_summary ? `\nResearch Summary:\n${research_summary}` : ""}
${key_points && key_points.length > 0 ? `\nKey Points to Include:\n${key_points.map((p) => `- ${p}`).join("\n")}` : ""}
${user_input ? `\nUser's Additional Input:\n${user_input}` : ""}

Please generate a detailed outline for a Substack post based on this information. The outline should:
1. Have a compelling title and subtitle
2. Include a strong hook that draws readers in
3. Be structured with clear sections (3-5 main sections)
4. Include key points for each section
5. Have a clear conclusion approach and optional call-to-action
6. Match the voice and style guidelines provided

Return the outline as a JSON object with the following structure:
{
  "outline": {
    "title": "Post title",
    "subtitle": "Compelling subtitle",
    "hook": "Opening hook/paragraph",
    "target_audience": "Who this post is for",
    "main_argument": "Core thesis/argument",
    "sections": [
      {
        "title": "Section title",
        "key_points": ["point 1", "point 2"],
        "estimated_words": 300,
        "hook": "Optional section hook"
      }
    ],
    "conclusion_approach": "How to wrap up",
    "call_to_action": "Optional CTA",
    "estimated_total_words": 1500,
    "tone_notes": "Notes about tone/style"
  },
  "summary": "Brief summary of this outline approach",
  "alternative_angles": ["angle 1", "angle 2", "angle 3"]
}
    `.trim();

    // Call AI
    const result = await callAI({
      promptConfig,
      systemPrompt,
      userPrompt: userMessage,
      sessionId: session_id,
    });

    // Parse the AI response as JSON
    const parsedResult = parseJSONResponse<OutlineResponse>(result.content);

    // Save to database if session_id provided
    if (session_id) {
      await adminSupabase.from("content_outlines").insert({
        session_id,
        outline_json: parsedResult.outline,
        selected: false,
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
    console.error("Generate outlines error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to generate outline",
      500
    );
  }
});
