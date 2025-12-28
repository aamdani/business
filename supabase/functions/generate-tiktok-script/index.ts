/**
 * Generate TikTok Script Edge Function
 *
 * Creates short-form video scripts for TikTok/Reels/Shorts.
 * Optimized for vertical format and quick engagement.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getSupabaseClient, getSupabaseAdmin, getAuthenticatedUser } from "../_shared/supabase.ts";
import { loadActivePromptConfig, buildPrompt } from "../_shared/prompts.ts";
import { callAI, parseJSONResponse } from "../_shared/ai.ts";

interface TikTokScriptRequest {
  draft_content: string;
  title: string;
  num_scripts?: number; // How many variations to generate (1-5)
  session_id?: string;
}

interface TikTokScript {
  hook: string;
  script: string;
  on_screen_text: string[];
  audio_suggestion?: string;
  hashtags: string[];
  estimated_seconds: number;
  style: string; // "talking head", "text overlay", "voiceover", etc.
}

interface TikTokScriptResult {
  topic: string;
  scripts: TikTokScript[];
  caption: string;
  best_posting_times: string[];
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
    const { draft_content, title, num_scripts = 3, session_id } =
      (await req.json()) as TikTokScriptRequest;

    if (!draft_content || draft_content.trim().length === 0) {
      return errorResponse("Draft content is required", 400);
    }

    // Limit number of scripts
    const scriptCount = Math.min(Math.max(num_scripts, 1), 5);

    // Load prompt configuration
    const promptConfig = await loadActivePromptConfig("tiktok_script_writer");

    // Get user's voice guidelines
    const adminSupabase = getSupabaseAdmin();
    const { data: voiceGuidelines } = await adminSupabase
      .from("voice_guidelines")
      .select("content")
      .eq("user_id", user.id)
      .single();

    // Build the system prompt
    const systemPrompt = buildPrompt(promptConfig, {
      voice_guidelines: voiceGuidelines?.content || "Authentic, relatable, slightly provocative.",
    });

    // Build user message
    const userMessage = `
Title: ${title}
Number of Scripts: ${scriptCount}

Source Content:
${draft_content.substring(0, 3000)}...

Create ${scriptCount} different TikTok/Reels/Shorts scripts from this content. Each script should:
1. Be 30-60 seconds max (optimized for algorithm)
2. Start with an irresistible hook (first 1-2 seconds are everything)
3. Deliver value fast - no lengthy intros
4. Feel native to short-form (not like a cut-down long video)
5. End with engagement driver (question, challenge, or cliffhanger)

Different angles to consider:
- Hot take / controversial opinion
- "Most people don't know..." reveal
- Quick tutorial / how-to
- Story-driven / personal experience
- Trend-jacking opportunity

Return a JSON object with this structure:
{
  "topic": "Core topic being covered",
  "scripts": [
    {
      "hook": "First 1-2 seconds hook (text that appears or first words)",
      "script": "Full script with natural speaking rhythm. Use ... for pauses. Keep it punchy.",
      "on_screen_text": ["text overlay 1", "text overlay 2"],
      "audio_suggestion": "Optional trending audio or original sound suggestion",
      "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
      "estimated_seconds": 45,
      "style": "talking head / text overlay / voiceover / duet-bait"
    }
  ],
  "caption": "Caption for the post (with call-to-action)",
  "best_posting_times": ["Tuesday 7pm", "Thursday 12pm"]
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
    const parsedResult = parseJSONResponse<TikTokScriptResult>(result.content);

    // Save to database if session_id provided
    if (session_id) {
      await adminSupabase.from("content_outputs").insert({
        session_id,
        output_type: "tiktok_scripts",
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
    console.error("Generate TikTok script error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to generate TikTok scripts",
      500
    );
  }
});
