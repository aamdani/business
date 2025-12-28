/**
 * Check Voice Edge Function
 *
 * Scores a draft against the user's voice guidelines.
 * Returns a score and specific feedback for improvement.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getSupabaseClient, getSupabaseAdmin, getAuthenticatedUser } from "../_shared/supabase.ts";
import { loadActivePromptConfig, buildPrompt } from "../_shared/prompts.ts";
import { callAI, parseJSONResponse } from "../_shared/ai.ts";

interface VoiceCheckRequest {
  draft: string;
  session_id?: string;
}

interface VoiceScore {
  overall_score: number;
  scores: {
    tone: number;
    style: number;
    vocabulary: number;
    personality: number;
  };
  strengths: string[];
  warnings: string[];
  suggestions: string[];
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
    const { draft, session_id } = (await req.json()) as VoiceCheckRequest;

    if (!draft || draft.trim().length === 0) {
      return errorResponse("Draft content is required", 400);
    }

    // Load prompt configuration
    const promptConfig = await loadActivePromptConfig("voice_checker");

    // Get user's voice guidelines
    const adminSupabase = getSupabaseAdmin();
    const { data: voiceGuidelines } = await adminSupabase
      .from("voice_guidelines")
      .select("content")
      .eq("user_id", user.id)
      .single();

    if (!voiceGuidelines?.content) {
      return jsonResponse({
        success: true,
        result: {
          overall_score: 0,
          scores: { tone: 0, style: 0, vocabulary: 0, personality: 0 },
          strengths: [],
          warnings: ["No voice guidelines found. Please set up your voice guidelines first."],
          suggestions: ["Go to Settings > Voice Guidelines to configure your writing voice."],
        },
        message: "No voice guidelines configured",
      });
    }

    // Build the system prompt with voice guidelines
    const systemPrompt = buildPrompt(promptConfig, {
      voice_guidelines: voiceGuidelines.content,
    });

    // Build user message
    const userMessage = `
Please analyze this draft against the voice guidelines:

---
${draft}
---

Evaluate the draft on:
1. Tone match (0-100): Does it match the intended tone?
2. Style consistency (0-100): Is the writing style consistent with guidelines?
3. Vocabulary alignment (0-100): Does it use appropriate vocabulary?
4. Personality match (0-100): Does it reflect the writer's personality?

Return your analysis as JSON:
{
  "overall_score": <average of all scores>,
  "scores": {
    "tone": <0-100>,
    "style": <0-100>,
    "vocabulary": <0-100>,
    "personality": <0-100>
  },
  "strengths": ["what works well", "..."],
  "warnings": ["specific issues to fix", "..."],
  "suggestions": ["actionable improvements", "..."]
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
    const voiceScore = parseJSONResponse<VoiceScore>(result.content);

    // Update draft with voice score if session_id provided
    if (session_id) {
      // Find the latest draft for this session and update its voice_score
      const { data: latestDraft } = await adminSupabase
        .from("content_drafts")
        .select("id")
        .eq("session_id", session_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (latestDraft) {
        await adminSupabase
          .from("content_drafts")
          .update({ voice_score: voiceScore.overall_score })
          .eq("id", latestDraft.id);
      }
    }

    return jsonResponse({
      success: true,
      result: voiceScore,
      tokens: {
        input: result.tokensIn,
        output: result.tokensOut,
      },
    });
  } catch (error) {
    console.error("Check voice error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to check voice",
      500
    );
  }
});
