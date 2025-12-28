"use client";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Search,
  ExternalLink,
  Check,
  ArrowRight,
  RefreshCw,
  Lightbulb,
  Quote,
  BarChart3,
  HelpCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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

interface ResearchResponse {
  success: boolean;
  result: ResearchResult;
  tokens: {
    input: number;
    output: number;
  };
}

export default function ResearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTheme = searchParams.get("theme") || "";
  const initialDescription = searchParams.get("description") || "";
  const sessionId = searchParams.get("session_id");

  const [theme, setTheme] = useState(initialTheme);
  const [additionalContext, setAdditionalContext] = useState(initialDescription);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPoints, setSelectedPoints] = useState<Set<string>>(new Set());
  const [selectedDataPoints, setSelectedDataPoints] = useState<Set<string>>(new Set());

  const handleResearch = useCallback(async () => {
    if (!theme.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError("Please log in to continue");
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-research`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            theme: theme.trim(),
            description: additionalContext.trim() || undefined,
            session_id: sessionId || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate research");
      }

      const data = (await response.json()) as ResearchResponse;
      setResult(data.result);

      // Update session status to 'research'
      if (sessionId) {
        await supabase
          .from("content_sessions")
          .update({ status: "research" })
          .eq("id", sessionId);
      }

      // Auto-select all key points and data points
      setSelectedPoints(new Set(data.result.key_points));
      setSelectedDataPoints(new Set(data.result.data_points));
    } catch (err) {
      console.error("Research error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, [theme, additionalContext, sessionId]);

  const togglePoint = (point: string) => {
    setSelectedPoints((prev) => {
      const next = new Set(prev);
      if (next.has(point)) {
        next.delete(point);
      } else {
        next.add(point);
      }
      return next;
    });
  };

  const toggleDataPoint = (point: string) => {
    setSelectedDataPoints((prev) => {
      const next = new Set(prev);
      if (next.has(point)) {
        next.delete(point);
      } else {
        next.add(point);
      }
      return next;
    });
  };

  const handleContinueToOutline = () => {
    // Navigate to outline with session_id
    // The outline page will load research data from the database
    const params = new URLSearchParams();
    if (sessionId) {
      params.set("session_id", sessionId);
    }
    // Pass selected points as URL params (or they can be loaded from session)
    params.set("theme", theme);
    router.push(`/outline?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Research</h1>
        <p className="text-muted-foreground">
          Gather real-time research on your topic using AI-powered web search.
        </p>
      </div>

      {/* Research Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Research Topic
          </CardTitle>
          <CardDescription>
            Enter a topic and we'll gather current research, statistics, and perspectives.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Topic</label>
            <Textarea
              placeholder="e.g., The impact of AI on content creation workflows"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="min-h-[80px]"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Additional Context (optional)</label>
            <Textarea
              placeholder="Any specific angles, questions, or aspects you want to explore..."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              className="min-h-[60px]"
              disabled={isLoading}
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleResearch}
              disabled={isLoading || !theme.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Researching...
                </>
              ) : result ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Research Again
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Start Research
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Research Results */}
      {result && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Quote className="h-5 w-5" />
                  Research Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {result.summary}
                </p>
              </CardContent>
            </Card>

            {/* Key Points */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Key Points
                </CardTitle>
                <CardDescription>
                  Click to select/deselect points to include in your outline
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.key_points.map((point, idx) => (
                    <button
                      key={idx}
                      onClick={() => togglePoint(point)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors flex items-start gap-3 ${
                        selectedPoints.has(point)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <div
                        className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          selectedPoints.has(point)
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        }`}
                      >
                        {selectedPoints.has(point) && (
                          <Check className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                      <span className="text-sm">{point}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Data Points */}
            {result.data_points.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Statistics & Data
                  </CardTitle>
                  <CardDescription>
                    Numbers and facts to strengthen your argument
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.data_points.map((point, idx) => (
                      <button
                        key={idx}
                        onClick={() => toggleDataPoint(point)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors flex items-start gap-3 ${
                          selectedDataPoints.has(point)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        <div
                          className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            selectedDataPoints.has(point)
                              ? "border-primary bg-primary"
                              : "border-muted-foreground"
                          }`}
                        >
                          {selectedDataPoints.has(point) && (
                            <Check className="h-3 w-3 text-primary-foreground" />
                          )}
                        </div>
                        <span className="text-sm">{point}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Sources */}
            {result.sources.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.sources.map((source, idx) => (
                      <a
                        key={idx}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="line-clamp-1">{source.title || source.url}</span>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Related Questions */}
            {result.related_questions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    Related Questions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.related_questions.map((question, idx) => (
                      <p key={idx} className="text-sm text-muted-foreground">
                        {question}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Selection Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Selection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Key points selected</span>
                  <Badge variant="secondary">{selectedPoints.size}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Data points selected</span>
                  <Badge variant="secondary">{selectedDataPoints.size}</Badge>
                </div>

                <Separator />

                <Button
                  className="w-full"
                  onClick={handleContinueToOutline}
                  disabled={selectedPoints.size === 0}
                >
                  Continue to Outline
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              Enter a topic above and click "Start Research" to gather real-time information
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
