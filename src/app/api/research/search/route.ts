import { NextRequest, NextResponse } from "next/server";
import {
  searchResearch,
  type ResearchSearchResult,
} from "@/lib/pinecone/search-research";

export interface SearchResearchRequestBody {
  query: string;
  topK?: number;
  minScore?: number;
}

export interface SearchResearchResponseBody {
  results: ResearchSearchResult[];
  query: string;
  count: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SearchResearchRequestBody;

    if (!body.query || body.query.trim().length === 0) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    const results = await searchResearch({
      query: body.query.trim(),
      topK: body.topK || 5,
      minScore: body.minScore || 0.5,
    });

    const response: SearchResearchResponseBody = {
      results,
      query: body.query.trim(),
      count: results.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Search research error:", error);
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
  const topK = parseInt(searchParams.get("topK") || "5", 10);
  const minScore = parseFloat(searchParams.get("minScore") || "0.5");

  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  try {
    const results = await searchResearch({
      query: query.trim(),
      topK,
      minScore,
    });

    const response: SearchResearchResponseBody = {
      results,
      query: query.trim(),
      count: results.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Search research error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
