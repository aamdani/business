"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Sparkles, Brain, Lightbulb, ArrowRight, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ExtractedTheme {
  theme: string;
  description: string;
  potential_angles: string[];
  related_topics: string[];
}

interface BrainDumpResult {
  themes: ExtractedTheme[];
  key_insights: string[];
  suggested_research_queries: string[];
  overall_direction: string;
}

interface ParseResponse {
  success: boolean;
  result: BrainDumpResult;
  tokens: {
    input: number;
    output: number;
  };
}

export default function CreatePage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<BrainDumpResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handleParse = useCallback(async () => {
    if (!content.trim()) return;

    setIsProcessing(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError("Please log in to continue");
        return;
      }

      // Create a content_session record FIRST
      const { data: newSession, error: sessionError } = await supabase
        .from("content_sessions")
        .insert({
          status: "brain_dump",
          title: content.trim().slice(0, 50) + (content.length > 50 ? "..." : ""),
        })
        .select()
        .single();

      if (sessionError) {
        throw new Error(`Failed to create session: ${sessionError.message}`);
      }

      setSessionId(newSession.id);

      // Call the Edge Function with session_id
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/parse-brain-dump`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            content: content.trim(),
            session_id: newSession.id,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to parse brain dump");
      }

      const data = (await response.json()) as ParseResponse;
      setResult(data.result);
    } catch (err) {
      console.error("Parse error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsProcessing(false);
    }
  }, [content]);

  const handleResearchTopic = (theme: ExtractedTheme) => {
    // Navigate to research page with session_id and theme
    const params = new URLSearchParams({
      theme: theme.theme,
      description: theme.description,
    });
    if (sessionId) {
      params.set("session_id", sessionId);
    }
    router.push(`/research?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Content</h1>
        <p className="text-muted-foreground">
          Start with a brain dump and let AI help you structure your ideas.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Brain Dump Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Brain Dump
            </CardTitle>
            <CardDescription>
              Write freely about your ideas, thoughts, and concepts. Don't worry about structure - just get it all out.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Start typing your ideas here...

For example:
- What's been on your mind lately?
- Any interesting observations or experiences?
- Topics you want to explore?
- Arguments or perspectives you want to share?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[300px] resize-none"
              disabled={isProcessing}
            />

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {content.length} characters
              </p>
              <Button
                onClick={handleParse}
                disabled={isProcessing || !content.trim()}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Extract Themes
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

        {/* Results Panel */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Overall Direction */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    Overall Direction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{result.overall_direction}</p>
                </CardContent>
              </Card>

              {/* Extracted Themes */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Themes</CardTitle>
                  <CardDescription>
                    Click "Research" on any theme to dive deeper
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {result.themes.map((theme, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-medium">{theme.theme}</h4>
                          <p className="text-sm text-muted-foreground">{theme.description}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResearchTopic(theme)}
                        >
                          <Search className="mr-1 h-3 w-3" />
                          Research
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {theme.potential_angles.map((angle, aIdx) => (
                          <Badge key={aIdx} variant="secondary" className="text-xs">
                            {angle}
                          </Badge>
                        ))}
                      </div>
                      {idx < result.themes.length - 1 && <Separator className="mt-3" />}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Key Insights */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Key Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.key_insights.map((insight, idx) => (
                      <li key={idx} className="flex gap-2 text-sm">
                        <span className="text-primary">•</span>
                        <span className="text-muted-foreground">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Suggested Research */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Suggested Research</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.suggested_research_queries.map((query, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="cursor-pointer hover:bg-accent"
                      >
                        {query}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Next Step */}
              <Button
                className="w-full"
                size="lg"
                onClick={() => {
                  if (result?.themes[0]) {
                    handleResearchTopic(result.themes[0]);
                  }
                }}
              >
                Continue to Research
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground text-center">
                  Write your brain dump and click "Extract Themes" to see AI-powered analysis
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
