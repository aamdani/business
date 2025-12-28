/**
 * Generate Headlines Edge Function
 *
 * Creates 5 headline options for a post, ranked by voice match score.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getSupabaseClient, getSupabaseAdmin, getAuthenticatedUser } from "../_shared/supabase.ts";
import { loadActivePromptConfig, buildPrompt } from "../_shared/prompts.ts";
import { callAI, parseJSONResponse } from "../_shared/ai.ts";

interface HeadlineRequest {
  content: string;
  theme?: string;
  session_id?: string;
}

interface Headline {
  text: string;
  angle: string;
  voice_score: number;
  reasoning?: string;
}

interface HeadlineResponse {
  headlines: Headline[];
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
    const { content, theme, session_id } = (await req.json()) as HeadlineRequest;

    if (!content || content.trim().length === 0) {
      return errorResponse("Content is required", 400);
    }

    // Load prompt configuration
    const promptConfig = await loadActivePromptConfig("headline_generator");

    // Get user's voice guidelines
    const adminSupabase = getSupabaseAdmin();
    const { data: voiceGuidelines } = await adminSupabase
      .from("voice_guidelines")
      .select("content")
      .eq("user_id", user.id)
      .single();

    // Build the system prompt with voice guidelines
    const systemPrompt = buildPrompt(promptConfig, {
      voice_guidelines: voiceGuidelines?.content || "Write headlines that are compelling and match the content's tone.",
    });

    // Build user message
    const userMessage = `
Generate 5 headline options for this content:

${theme ? `Theme: ${theme}\n` : ""}

Content:
---
${content.slice(0, 3000)}${content.length > 3000 ? "..." : ""}
---

Create 5 headlines that:
1. Use sentence case (not Title Case)
2. Match the voice guidelines
3. Have different angles (curiosity, benefit, controversy, story, insight)
4. Are optimized for email subject lines (under 60 characters preferred)

Return as JSON:
{
  "headlines": [
    {
      "text": "Your headline here",
      "angle": "curiosity|benefit|controversy|story|insight",
      "voice_score": 0-100,
      "reasoning": "Brief explanation of why this works"
    }
  ]
}

Sort by voice_score descending.
    `.trim();

    // Call AI
    const result = await callAI({
      promptConfig,
      systemPrompt,
      userPrompt: userMessage,
      sessionId: session_id,
    });

    // Parse the AI response as JSON
    const headlineData = parseJSONResponse<HeadlineResponse>(result.content);

    // Sort by voice_score descending
    headlineData.headlines.sort((a, b) => b.voice_score - a.voice_score);

    return jsonResponse({
      success: true,
      headlines: headlineData.headlines,
      tokens: {
        input: result.tokensIn,
        output: result.tokensOut,
      },
    });
  } catch (error) {
    console.error("Generate headlines error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to generate headlines",
      500
    );
  }
});
