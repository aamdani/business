import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchPosts, type SearchResult } from "@/lib/pinecone/search";

export interface SearchRequestBody {
  query: string;
  namespaces?: string[];
  topK?: number;
}

export interface SearchResponseBody {
  results: SearchResult[];
  query: string;
  count: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SearchRequestBody;

    if (!body.query || body.query.trim().length === 0) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const results = await searchPosts(supabase, {
      query: body.query.trim(),
      namespaces: body.namespaces,
      topK: body.topK || 10,
    });

    const response: SearchResponseBody = {
      results,
      query: body.query.trim(),
      count: results.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}

// Also support GET for simple queries
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  const namespacesParam = searchParams.get("namespaces");
  const topK = parseInt(searchParams.get("topK") || "10", 10);

  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  // Parse namespaces (comma-separated)
  let namespaces: string[] | undefined;
  if (namespacesParam) {
    namespaces = namespacesParam.split(",").map((s) => s.trim());
  }

  try {
    const supabase = await createClient();

    const results = await searchPosts(supabase, {
      query: query.trim(),
      namespaces,
      topK,
    });

    const response: SearchResponseBody = {
      results,
      query: query.trim(),
      count: results.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
