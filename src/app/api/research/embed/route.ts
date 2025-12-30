import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { embedResearch } from "@/lib/pinecone/embed-research";

// Use service role client for async operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface EmbedResearchRequestBody {
  research_id: string;
  query: string;
  response: string;
  session_id: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as EmbedResearchRequestBody;

    // Validate required fields
    if (!body.research_id || !body.query || !body.response || !body.session_id) {
      return NextResponse.json(
        { error: "research_id, query, response, and session_id are required" },
        { status: 400 }
      );
    }

    // Embed in Pinecone
    const result = await embedResearch(
      body.research_id,
      body.query,
      body.response,
      body.session_id
    );

    // Update database with result
    if (result.success) {
      await supabase
        .from("content_research")
        .update({
          pinecone_indexed: true,
          pinecone_indexed_at: new Date().toISOString(),
          pinecone_error: null,
        })
        .eq("id", body.research_id);
    } else {
      await supabase
        .from("content_research")
        .update({
          pinecone_indexed: false,
          pinecone_error: result.error,
        })
        .eq("id", body.research_id);
    }

    return NextResponse.json({
      success: result.success,
      vectorId: result.vectorId,
      error: result.error,
    });
  } catch (error) {
    console.error("Embed research error:", error);
    return NextResponse.json(
      { error: "Failed to embed research" },
      { status: 500 }
    );
  }
}
