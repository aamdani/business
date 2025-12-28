/**
 * Generate Research Edge Function
 *
 * Uses Perplexity to gather real-time research on a given topic.
 * Returns structured research with sources and citations.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getSupabaseClient, getSupabaseAdmin, getAuthenticatedUser } from "../_shared/supabase.ts";
import { loadActivePromptConfig, buildPrompt } from "../_shared/prompts.ts";
import { EdgeFunctionSettings } from "../_shared/settings.ts";

interface ResearchRequest {
  theme: string;
  description?: string;
  angles?: string[];
  session_id?: string;
}

interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
}

interface ResearchResult {
  topic: string;
  summary: string;
  key_points: string[];
  sources: ResearchSource[];
  related_questions: string[];
  data_points: string[];
}

interface PerplexityMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface PerplexityResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  citations?: string[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
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
    const { theme, description, angles, session_id } = (await req.json()) as ResearchRequest;

    if (!theme || theme.trim().length === 0) {
      return errorResponse("Research theme is required", 400);
    }

    // Load prompt configuration and settings from database (Rule 1: No Hardcoded Values)
    const promptConfig = await loadActivePromptConfig("research_generator");
    const settings = await EdgeFunctionSettings.generateResearch();

    // Build the research query
    const userMessage = `
Topic: ${theme}
${description ? `Description: ${description}` : ""}
${angles && angles.length > 0 ? `Potential angles to explore: ${angles.join(", ")}` : ""}

Please research this topic thoroughly and provide:
1. A comprehensive summary of the current state of knowledge
2. Key statistics, data points, or facts
3. Different perspectives or debates around this topic
4. Recent developments or news
5. Expert opinions or notable quotes
6. Practical applications or implications
    `.trim();

    // Call Perplexity via Vercel AI Gateway
    const gatewayApiKey = Deno.env.get("VERCEL_AI_GATEWAY_API_KEY");
    if (!gatewayApiKey) {
      throw new Error("VERCEL_AI_GATEWAY_API_KEY not configured");
    }

    const startTime = Date.now();

    const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${gatewayApiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        max_tokens: settings.maxTokens,
        temperature: settings.temperature,
        messages: [
          {
            role: "system",
            content: buildPrompt(promptConfig, {}),
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as PerplexityResponse;
    const durationMs = Date.now() - startTime;

    // Extract response
    const content = data.choices?.[0]?.message?.content || "";
    const citations = data.citations || [];
    const tokensIn = data.usage?.prompt_tokens;
    const tokensOut = data.usage?.completion_tokens;

    // Build sources from citations
    const sources: ResearchSource[] = citations.map((url, idx) => ({
      title: `Source ${idx + 1}`,
      url,
      snippet: "", // Perplexity doesn't always provide snippets separately
    }));

    // Log the AI call
    const adminSupabase = getSupabaseAdmin();
    await adminSupabase.from("ai_call_logs").insert({
      session_id: session_id || null,
      prompt_set_slug: "research_generator",
      full_prompt: `System: ${buildPrompt(promptConfig, {})}\n\nUser: ${userMessage}`,
      full_response: content,
      model_id: settings.model,
      tokens_in: tokensIn || null,
      tokens_out: tokensOut || null,
      duration_ms: durationMs,
    });

    // Parse the response into structured format
    const result: ResearchResult = {
      topic: theme,
      summary: content,
      key_points: extractKeyPoints(content),
      sources,
      related_questions: extractQuestions(content),
      data_points: extractDataPoints(content),
    };

    // Save to database if session_id provided
    if (session_id) {
      await adminSupabase.from("content_research").insert({
        session_id,
        query: theme,
        response: content,
        sources: sources,
      });
    }

    return jsonResponse({
      success: true,
      result,
      tokens: {
        input: tokensIn,
        output: tokensOut,
      },
    });
  } catch (error) {
    console.error("Generate research error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to generate research",
      500
    );
  }
});

// Helper: Extract key points from research text
function extractKeyPoints(content: string): string[] {
  const lines = content.split("\n");
  const keyPoints: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Look for bullet points or numbered items
    if (
      trimmed.startsWith("- ") ||
      trimmed.startsWith("• ") ||
      trimmed.startsWith("* ") ||
      /^\d+\.\s/.test(trimmed)
    ) {
      const point = trimmed.replace(/^[-•*\d.]\s*/, "").trim();
      if (point.length > 10 && point.length < 300) {
        keyPoints.push(point);
      }
    }
  }

  return keyPoints.slice(0, 10); // Limit to 10 key points
}

// Helper: Extract questions from research text
function extractQuestions(content: string): string[] {
  const questions: string[] = [];
  const lines = content.split(/[.!?]\s/);

  for (const line of lines) {
    if (line.includes("?")) {
      const question = line.split("?")[0] + "?";
      if (question.length > 15 && question.length < 200) {
        questions.push(question.trim());
      }
    }
  }

  return questions.slice(0, 5); // Limit to 5 questions
}

// Helper: Extract data points (numbers, percentages, statistics)
function extractDataPoints(content: string): string[] {
  const dataPoints: string[] = [];
  const sentences = content.split(/[.!]\s/);

  for (const sentence of sentences) {
    // Look for percentages, numbers, dates
    if (
      /\d+%/.test(sentence) ||
      /\$[\d,]+/.test(sentence) ||
      /\d{4}/.test(sentence) ||
      /\d+\s*(million|billion|thousand)/i.test(sentence)
    ) {
      const cleaned = sentence.trim();
      if (cleaned.length > 20 && cleaned.length < 250) {
        dataPoints.push(cleaned);
      }
    }
  }

  return dataPoints.slice(0, 8); // Limit to 8 data points
}
