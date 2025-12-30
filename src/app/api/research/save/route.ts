import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { embedResearch } from "@/lib/pinecone/embed-research";

export interface SaveResearchRequestBody {
  session_id: string;
  query: string;
  response: string;
  citations?: string[];
}

export interface SaveResearchResponseBody {
  success: boolean;
  research_id: string;
  pinecone_status: "pending" | "success" | "failed";
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SaveResearchRequestBody;

    // Validate required fields
    if (!body.session_id || !body.query || !body.response) {
      return NextResponse.json(
        { error: "session_id, query, and response are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Insert research into database
    const { data: research, error: insertError } = await supabase
      .from("content_research")
      .insert({
        session_id: body.session_id,
        query: body.query,
        response: body.response,
        citations: body.citations || [],
        pinecone_indexed: false,
      })
      .select("id")
      .single();

    if (insertError || !research) {
      console.error("Failed to save research:", insertError);
      return NextResponse.json(
        { error: "Failed to save research to database" },
        { status: 500 }
      );
    }

    // Embed in Pinecone (async - don't block response)
    // Fire and forget, update status in background
    embedResearchAsync(
      supabase,
      research.id,
      body.query,
      body.response,
      body.session_id
    );

    const response: SaveResearchResponseBody = {
      success: true,
      research_id: research.id,
      pinecone_status: "pending",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Save research error:", error);
    return NextResponse.json(
      { error: "Failed to save research" },
      { status: 500 }
    );
  }
}

/**
 * Async function to embed research in Pinecone
 * Updates database with result - doesn't block API response
 */
async function embedResearchAsync(
  supabase: Awaited<ReturnType<typeof createClient>>,
  researchId: string,
  query: string,
  response: string,
  sessionId: string
) {
  try {
    const result = await embedResearch(researchId, query, response, sessionId);

    if (result.success) {
      await supabase
        .from("content_research")
        .update({
          pinecone_indexed: true,
          pinecone_indexed_at: new Date().toISOString(),
          pinecone_error: null,
        })
        .eq("id", researchId);
    } else {
      await supabase
        .from("content_research")
        .update({
          pinecone_indexed: false,
          pinecone_error: result.error,
        })
        .eq("id", researchId);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Async embedding failed for ${researchId}:`, errorMessage);

    await supabase
      .from("content_research")
      .update({
        pinecone_indexed: false,
        pinecone_error: errorMessage,
      })
      .eq("id", researchId);
  }
}
