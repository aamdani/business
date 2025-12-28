"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Search,
  ExternalLink,
  Copy,
  Quote,
  Link2,
} from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  author: string;
  source: string;
  url?: string;
  publishedAt?: string;
  contentPreview: string;
  score: number;
}

interface CrossReferencePanelProps {
  context?: string; // Current content context for relevance
  onInsertReference?: (reference: { title: string; url: string; quote?: string }) => void;
}

export function CrossReferencePanel({ context, onInsertReference }: CrossReferencePanelProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [sources, setSources] = useState({
    jon: true,
    nate: true,
  });
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      const sourceFilter = [];
      if (sources.jon) sourceFilter.push("jon");
      if (sources.nate) sourceFilter.push("nate");

      const params = new URLSearchParams({
        q: query.trim(),
        sources: sourceFilter.join(","),
        topK: "10",
      });

      const response = await fetch(`/api/search?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      console.error("Search error:", err);
      setError("Failed to search. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }, [query, sources]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const insertAsLink = (result: SearchResult) => {
    if (onInsertReference && result.url) {
      onInsertReference({
        title: result.title,
        url: result.url,
      });
    }
  };

  const insertAsQuote = (result: SearchResult) => {
    if (onInsertReference && result.url) {
      onInsertReference({
        title: result.title,
        url: result.url,
        quote: result.contentPreview,
      });
    }
  };

  const getSourceLabel = (source: string) => {
    const sourceLower = source.toLowerCase();
    if (sourceLower.includes("jon") || sourceLower === "jon-substack") return "Jon";
    if (sourceLower.includes("nate") || sourceLower === "nate-substack") return "Nate";
    return source;
  };

  const getSourceColor = (source: string) => {
    const sourceLower = source.toLowerCase();
    return sourceLower.includes("jon") ? "default" : "secondary";
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Link2 className="h-5 w-5" />
          Cross-References
        </CardTitle>
        <CardDescription>
          Search for related posts to link in your content
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        {/* Search Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Search topics..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button
            onClick={handleSearch}
            disabled={isSearching || !query.trim()}
            size="icon"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Source Filters */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="source-jon"
              checked={sources.jon}
              onCheckedChange={(checked) =>
                setSources((prev) => ({ ...prev, jon: checked as boolean }))
              }
            />
            <label htmlFor="source-jon" className="text-sm cursor-pointer">
              Jon's posts
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="source-nate"
              checked={sources.nate}
              onCheckedChange={(checked) =>
                setSources((prev) => ({ ...prev, nate: checked as boolean }))
              }
            />
            <label htmlFor="source-nate" className="text-sm cursor-pointer">
              Nate's posts
            </label>
          </div>
        </div>

        <Separator />

        {/* Results */}
        <ScrollArea className="flex-1">
          {error && (
            <p className="text-sm text-destructive text-center py-4">{error}</p>
          )}

          {!results.length && !isSearching && !error && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Search for related content to link
            </p>
          )}

          <div className="space-y-3">
            {results.map((result) => (
              <div
                key={result.id}
                className="rounded-lg border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getSourceColor(result.source)} className="text-xs">
                        {getSourceLabel(result.source)}
                      </Badge>
                      {result.publishedAt && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(result.publishedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <h4 className="font-medium text-sm line-clamp-2">
                      {result.title}
                    </h4>
                  </div>
                  {result.url && (
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {result.contentPreview}
                </p>

                <div className="flex gap-1">
                  {result.url && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => insertAsLink(result)}
                      >
                        <Link2 className="h-3 w-3 mr-1" />
                        Insert Link
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => insertAsQuote(result)}
                      >
                        <Quote className="h-3 w-3 mr-1" />
                        Quote
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => copyToClipboard(result.url!)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy URL
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
