/**
 * AI Client for Edge Functions
 *
 * Calls AI providers through Vercel AI Gateway
 * Rule 2: Database-Driven AI Model Configuration
 * Rule 13: AI Call Logging
 */

import { getSupabaseAdmin } from "./supabase.ts";
import type { PromptConfig } from "./prompts.ts";

export interface AICallOptions {
  promptConfig: PromptConfig;
  systemPrompt: string;
  userPrompt: string;
  sessionId?: string;
}

export interface AICallResult {
  content: string;
  tokensIn?: number;
  tokensOut?: number;
  durationMs: number;
}

/**
 * Call AI provider through Vercel AI Gateway
 */
export async function callAI(options: AICallOptions): Promise<AICallResult> {
  const { promptConfig, systemPrompt, userPrompt, sessionId } = options;
  const startTime = Date.now();

  const gatewayApiKey = Deno.env.get("VERCEL_AI_GATEWAY_API_KEY");
  if (!gatewayApiKey) {
    throw new Error("VERCEL_AI_GATEWAY_API_KEY not configured");
  }

  // Construct the full prompt for logging
  const fullPrompt = `System: ${systemPrompt}\n\nUser: ${userPrompt}`;

  try {
    // Call Vercel AI Gateway (OpenAI-compatible endpoint)
    // Docs: https://vercel.com/docs/ai-gateway
    const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${gatewayApiKey}`,
      },
      body: JSON.stringify({
        model: promptConfig.modelId, // Format: "anthropic/claude-sonnet-4-5"
        max_tokens: promptConfig.apiConfig.max_tokens || 4096,
        temperature: promptConfig.apiConfig.temperature || 0.7,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const durationMs = Date.now() - startTime;

    // Extract response content (OpenAI-compatible format)
    const content = data.choices?.[0]?.message?.content || "";
    const tokensIn = data.usage?.prompt_tokens;
    const tokensOut = data.usage?.completion_tokens;

    // Log the call (Rule 13)
    await logAICall({
      sessionId,
      promptSetSlug: promptConfig.slug,
      fullPrompt,
      fullResponse: content,
      modelId: promptConfig.modelId,
      tokensIn,
      tokensOut,
      durationMs,
    });

    return {
      content,
      tokensIn,
      tokensOut,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;

    // Log the error
    await logAICall({
      sessionId,
      promptSetSlug: promptConfig.slug,
      fullPrompt,
      fullResponse: "",
      modelId: promptConfig.modelId,
      durationMs,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}

/**
 * Log AI call to database for troubleshooting
 */
async function logAICall(params: {
  sessionId?: string;
  promptSetSlug: string;
  fullPrompt: string;
  fullResponse: string;
  modelId: string;
  tokensIn?: number;
  tokensOut?: number;
  durationMs: number;
  errorMessage?: string;
}) {
  try {
    const supabase = getSupabaseAdmin();

    await supabase.from("ai_call_logs").insert({
      session_id: params.sessionId || null,
      prompt_set_slug: params.promptSetSlug,
      full_prompt: params.fullPrompt,
      full_response: params.fullResponse,
      model_id: params.modelId,
      tokens_in: params.tokensIn || null,
      tokens_out: params.tokensOut || null,
      duration_ms: params.durationMs,
      error_message: params.errorMessage || null,
    });
  } catch (error) {
    // Don't throw on logging errors - just warn
    console.warn("Failed to log AI call:", error);
  }
}

/**
 * Parse JSON from AI response (handles markdown code blocks)
 */
export function parseJSONResponse<T>(content: string): T {
  let jsonStr = content.trim();

  // Try to extract JSON from markdown code blocks (various formats)
  // Match ```json, ```JSON, or just ```
  const jsonMatch = content.match(/```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  } else {
    // Try stripping just the opening/closing backticks if they're on their own lines
    jsonStr = jsonStr
      .replace(/^```(?:json|JSON)?\s*\n/, '')
      .replace(/\n```\s*$/, '')
      .trim();
  }

  // If it still starts with ``` something is wrong
  if (jsonStr.startsWith('```')) {
    throw new Error(`Failed to strip markdown code blocks from response: ${jsonStr.substring(0, 100)}...`);
  }

  try {
    return JSON.parse(jsonStr) as T;
  } catch (error) {
    throw new Error(`Failed to parse AI response as JSON: ${error}`);
  }
}
