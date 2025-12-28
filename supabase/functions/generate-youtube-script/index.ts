/**
 * Generate YouTube Script Edge Function
 *
 * Converts a Substack post draft into a YouTube video script.
 * Includes timestamps, B-roll suggestions, and hook optimization.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getSupabaseClient, getSupabaseAdmin, getAuthenticatedUser } from "../_shared/supabase.ts";
import { loadActivePromptConfig, buildPrompt } from "../_shared/prompts.ts";
import { callAI, parseJSONResponse } from "../_shared/ai.ts";

interface YouTubeScriptRequest {
  draft_content: string;
  title: string;
  target_length?: "short" | "medium" | "long"; // 5-8min, 10-15min, 20+min
  session_id?: string;
}

interface YouTubeSection {
  timestamp: string;
  section_title: string;
  script_content: string;
  b_roll_suggestions: string[];
  on_screen_text?: string;
}

interface YouTubeScriptResult {
  title: string;
  hook: string;
  thumbnail_concepts: string[];
  sections: YouTubeSection[];
  outro: string;
  call_to_action: string;
  description: string;
  tags: string[];
  estimated_duration: string;
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
    const { draft_content, title, target_length = "medium", session_id } =
      (await req.json()) as YouTubeScriptRequest;

    if (!draft_content || draft_content.trim().length === 0) {
      return errorResponse("Draft content is required", 400);
    }

    // Load prompt configuration
    const promptConfig = await loadActivePromptConfig("youtube_script_writer");

    // Get user's voice guidelines
    const adminSupabase = getSupabaseAdmin();
    const { data: voiceGuidelines } = await adminSupabase
      .from("voice_guidelines")
      .select("content")
      .eq("user_id", user.id)
      .single();

    // Build the system prompt
    const systemPrompt = buildPrompt(promptConfig, {
      voice_guidelines: voiceGuidelines?.content || "Conversational, engaging, with personality.",
    });

    // Target durations
    const durationGuide = {
      short: "5-8 minutes (concise, punchy, get to the point fast)",
      medium: "10-15 minutes (balanced depth and engagement)",
      long: "20+ minutes (deep dive, comprehensive coverage)",
    };

    // Build user message
    const userMessage = `
Title: ${title}
Target Length: ${durationGuide[target_length]}

Original Draft:
${draft_content}

Convert this Substack post into an engaging YouTube video script. The script should:
1. Open with a compelling hook (first 30 seconds are critical for retention)
2. Include natural speech patterns (not written prose)
3. Add B-roll suggestions for visual variety
4. Include on-screen text callouts for key points
5. Have clear section transitions
6. End with a strong call-to-action

Return a JSON object with this structure:
{
  "title": "YouTube-optimized title (50-60 chars, curiosity-driven)",
  "hook": "Opening 30 seconds script text - must grab attention immediately",
  "thumbnail_concepts": ["concept 1", "concept 2", "concept 3"],
  "sections": [
    {
      "timestamp": "0:00",
      "section_title": "Section name",
      "script_content": "What to say in this section (conversational)",
      "b_roll_suggestions": ["visual idea 1", "visual idea 2"],
      "on_screen_text": "Optional text overlay"
    }
  ],
  "outro": "Closing script text",
  "call_to_action": "Specific CTA for engagement",
  "description": "YouTube description with links and timestamps",
  "tags": ["tag1", "tag2", "tag3"],
  "estimated_duration": "X:XX"
}

Return ONLY valid JSON, no markdown code blocks.
    `.trim();

    // Call AI
    const result = await callAI({
      promptConfig,
      systemPrompt,
      userPrompt: userMessage,
      sessionId: session_id,
    });

    // Parse the AI response as JSON
    const parsedResult = parseJSONResponse<YouTubeScriptResult>(result.content);

    // Save to database if session_id provided
    if (session_id) {
      await adminSupabase.from("content_outputs").insert({
        session_id,
        output_type: "youtube_script",
        content: parsedResult,
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
    console.error("Generate YouTube script error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to generate YouTube script",
      500
    );
  }
});
