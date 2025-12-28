import { NextRequest, NextResponse } from "next/server";
import { searchPosts, type SearchResult } from "@/lib/pinecone/search";

export interface SearchRequestBody {
  query: string;
  sources?: ("jon" | "nate")[];
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

    const results = await searchPosts({
      query: body.query.trim(),
      sources: body.sources,
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
  const sourcesParam = searchParams.get("sources");
  const topK = parseInt(searchParams.get("topK") || "10", 10);

  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  // Parse sources (comma-separated)
  let sources: ("jon" | "nate")[] | undefined;
  if (sourcesParam) {
    sources = sourcesParam.split(",").filter(
      (s): s is "jon" | "nate" => s === "jon" || s === "nate"
    );
  }

  try {
    const results = await searchPosts({
      query: query.trim(),
      sources,
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
