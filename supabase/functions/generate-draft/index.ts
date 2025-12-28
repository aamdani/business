/**
 * Generate Draft Edge Function
 *
 * Creates a full Substack draft based on outline and research.
 * Uses SSE streaming for real-time output.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, errorResponse } from "../_shared/cors.ts";
import { getSupabaseClient, getSupabaseAdmin, getAuthenticatedUser } from "../_shared/supabase.ts";
import { loadActivePromptConfig, buildPrompt } from "../_shared/prompts.ts";
import { EdgeFunctionSettings } from "../_shared/settings.ts";

interface DraftRequest {
  outline: {
    title: string;
    subtitle: string;
    hook: string;
    sections: Array<{
      title: string;
      key_points: string[];
    }>;
    conclusion_approach: string;
    call_to_action?: string;
  };
  research_summary?: string;
  cross_references?: string[];
  session_id?: string;
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
    const { outline, research_summary, cross_references, session_id } = (await req.json()) as DraftRequest;

    if (!outline || !outline.title) {
      return errorResponse("Outline is required", 400);
    }

    // Load prompt configuration and settings
    const promptConfig = await loadActivePromptConfig("draft_writer_substack");
    const settings = await EdgeFunctionSettings.generateDraft();

    // Get user's voice guidelines
    const adminSupabase = getSupabaseAdmin();
    const { data: voiceGuidelines } = await adminSupabase
      .from("voice_guidelines")
      .select("content")
      .eq("user_id", user.id)
      .single();

    // Build the system prompt with voice guidelines
    const systemPrompt = buildPrompt(promptConfig, {
      voice_guidelines: voiceGuidelines?.content || "Write in a clear, conversational tone.",
    });

    // Build the outline as structured text
    const outlineText = `
Title: ${outline.title}
Subtitle: ${outline.subtitle}

Opening Hook:
${outline.hook}

Sections:
${outline.sections.map((s, i) => `
${i + 1}. ${s.title}
   Key points:
   ${s.key_points.map(p => `   - ${p}`).join('\n')}
`).join('\n')}

Conclusion Approach:
${outline.conclusion_approach}
${outline.call_to_action ? `\nCall to Action: ${outline.call_to_action}` : ''}
    `.trim();

    // Build the user message
    const userMessage = `
Please write a complete Substack post based on this outline:

${outlineText}

${research_summary ? `\nResearch to incorporate:\n${research_summary}` : ''}

${cross_references && cross_references.length > 0 ? `\nRelevant posts to reference (incorporate naturally as inline links):\n${cross_references.join('\n')}` : ''}

Write the full post in Markdown format. Make it engaging, personal, and aligned with the voice guidelines.
    `.trim();

    // Get API key
    const gatewayApiKey = Deno.env.get("VERCEL_AI_GATEWAY_API_KEY");
    if (!gatewayApiKey) {
      throw new Error("VERCEL_AI_GATEWAY_API_KEY not configured");
    }

    const startTime = Date.now();

    // Check if client wants streaming
    const acceptHeader = req.headers.get("accept") || "";
    const wantsStream = acceptHeader.includes("text/event-stream");

    if (wantsStream) {
      // SSE Streaming response
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          try {
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
                stream: true,
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userMessage },
                ],
              }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorText })}\n\n`));
              controller.close();
              return;
            }

            const reader = response.body?.getReader();
            if (!reader) {
              controller.close();
              return;
            }

            let fullContent = "";
            const decoder = new TextDecoder();

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              const lines = chunk.split("\n");

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const data = line.slice(6);
                  if (data === "[DONE]") {
                    controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                  } else {
                    try {
                      const parsed = JSON.parse(data);
                      const content = parsed.choices?.[0]?.delta?.content || "";
                      if (content) {
                        fullContent += content;
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                      }
                    } catch {
                      // Skip non-JSON lines
                    }
                  }
                }
              }
            }

            const durationMs = Date.now() - startTime;

            // Log the call
            await adminSupabase.from("ai_call_logs").insert({
              session_id: session_id || null,
              prompt_set_slug: "draft_writer_substack",
              full_prompt: `System: ${systemPrompt}\n\nUser: ${userMessage}`,
              full_response: fullContent,
              model_id: settings.model,
              duration_ms: durationMs,
            });

            // Save draft to database
            if (session_id) {
              await adminSupabase.from("content_drafts").insert({
                session_id,
                content: fullContent,
                voice_score: null, // Will be checked separately
              });
            }

            controller.close();
          } catch (error) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(error) })}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    } else {
      // Non-streaming response
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
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const durationMs = Date.now() - startTime;
      const content = data.choices?.[0]?.message?.content || "";
      const tokensIn = data.usage?.prompt_tokens;
      const tokensOut = data.usage?.completion_tokens;

      // Log the call
      await adminSupabase.from("ai_call_logs").insert({
        session_id: session_id || null,
        prompt_set_slug: "draft_writer_substack",
        full_prompt: `System: ${systemPrompt}\n\nUser: ${userMessage}`,
        full_response: content,
        model_id: settings.model,
        tokens_in: tokensIn || null,
        tokens_out: tokensOut || null,
        duration_ms: durationMs,
      });

      // Save draft to database
      if (session_id) {
        await adminSupabase.from("content_drafts").insert({
          session_id,
          content,
          voice_score: null,
        });
      }

      return new Response(JSON.stringify({
        success: true,
        draft: content,
        tokens: { input: tokensIn, output: tokensOut },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Generate draft error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to generate draft",
      500
    );
  }
});
