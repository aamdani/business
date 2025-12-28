"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  FileText,
  ArrowRight,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Target,
  Users,
  MessageSquare,
  List,
  Lightbulb,
  ArrowLeft,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface OutlineSection {
  title: string;
  key_points: string[];
  estimated_words: number;
  hook?: string;
}

interface Outline {
  title: string;
  subtitle: string;
  hook: string;
  target_audience: string;
  main_argument: string;
  sections: OutlineSection[];
  conclusion_approach: string;
  call_to_action?: string;
  estimated_total_words: number;
  tone_notes: string;
}

interface OutlineResponse {
  outline: Outline;
  summary: string;
  alternative_angles: string[];
}

interface ResearchData {
  theme: string;
  key_points: string[];
  data_points: string[];
  summary?: string;
}

export default function OutlinePage() {
  const router = useRouter();
  const [research, setResearch] = useState<ResearchData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<OutlineResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userInput, setUserInput] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

  // Load research data from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem("selectedResearch");
    if (stored) {
      try {
        const data = JSON.parse(stored) as ResearchData;
        setResearch(data);
      } catch {
        console.error("Failed to parse stored research");
      }
    }
  }, []);

  const handleGenerateOutline = useCallback(async () => {
    if (!research) return;

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
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-outlines`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            theme: research.theme,
            research_summary: research.summary,
            key_points: [...research.key_points, ...research.data_points],
            user_input: userInput.trim() || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate outline");
      }

      const data = await response.json();
      setResult(data.result);

      // Expand first section by default
      setExpandedSections(new Set([0]));
    } catch (err) {
      console.error("Outline error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, [research, userInput]);

  // Auto-generate on mount if research is available
  useEffect(() => {
    if (research && !result && !isLoading) {
      handleGenerateOutline();
    }
  }, [research, result, isLoading, handleGenerateOutline]);

  const toggleSection = (index: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleContinueToDraft = () => {
    if (!result) return;

    // Store outline for draft generation
    sessionStorage.setItem("selectedOutline", JSON.stringify({
      ...result.outline,
      research_summary: research?.summary,
    }));
    router.push("/draft");
  };

  const handleBackToResearch = () => {
    router.push("/research");
  };

  if (!research) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Outline</h1>
          <p className="text-muted-foreground">
            Create a detailed outline for your content.
          </p>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center mb-4">
              No research data found. Please start with research first.
            </p>
            <Button onClick={handleBackToResearch}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go to Research
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Outline</h1>
          <p className="text-muted-foreground">
            Review and refine your content outline before drafting.
          </p>
        </div>
        <Button variant="outline" onClick={handleBackToResearch}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Research
        </Button>
      </div>

      {/* Research Context */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Research Context</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="font-medium">{research.theme}</p>
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary">{research.key_points.length} key points</Badge>
              <Badge variant="secondary">{research.data_points.length} data points</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modification Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Refine the Outline
          </CardTitle>
          <CardDescription>
            Add any specific requests or modifications for the outline
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="e.g., Focus more on practical examples, make it shorter, add a controversial angle..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className="min-h-[80px]"
            disabled={isLoading}
          />

          <div className="flex justify-end">
            <Button
              onClick={handleGenerateOutline}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : result ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate Outline
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Outline
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

      {/* Outline Results */}
      {result && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Outline */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title & Hook */}
            <Card>
              <CardHeader>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">{result.outline.title}</h2>
                  <p className="text-lg text-muted-foreground">{result.outline.subtitle}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Opening Hook</h3>
                  <p className="text-foreground italic">{result.outline.hook}</p>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Main Argument
                  </h3>
                  <p className="text-foreground">{result.outline.main_argument}</p>
                </div>
              </CardContent>
            </Card>

            {/* Sections */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <List className="h-5 w-5" />
                  Sections
                </CardTitle>
                <CardDescription>
                  Click to expand section details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.outline.sections.map((section, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border"
                    >
                      <button
                        onClick={() => toggleSection(idx)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-medium">
                            {idx + 1}
                          </span>
                          <span className="font-medium">{section.title}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs">
                            ~{section.estimated_words} words
                          </Badge>
                          {expandedSections.has(idx) ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {expandedSections.has(idx) && (
                        <div className="px-4 pb-4 space-y-3">
                          <Separator />

                          {section.hook && (
                            <div>
                              <h4 className="text-sm font-medium text-muted-foreground mb-1">Section Hook</h4>
                              <p className="text-sm italic">{section.hook}</p>
                            </div>
                          )}

                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Key Points</h4>
                            <ul className="space-y-1">
                              {section.key_points.map((point, pointIdx) => (
                                <li key={pointIdx} className="text-sm flex items-start gap-2">
                                  <span className="text-primary mt-1">•</span>
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Conclusion */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Conclusion Approach</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground">{result.outline.conclusion_approach}</p>

                {result.outline.call_to_action && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Call to Action</h3>
                      <p className="text-foreground">{result.outline.call_to_action}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Outline Meta */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Outline Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estimated words</span>
                  <Badge variant="secondary">{result.outline.estimated_total_words}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sections</span>
                  <Badge variant="secondary">{result.outline.sections.length}</Badge>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Target Audience
                  </h4>
                  <p className="text-sm">{result.outline.target_audience}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Tone Notes</h4>
                  <p className="text-sm">{result.outline.tone_notes}</p>
                </div>
              </CardContent>
            </Card>

            {/* Alternative Angles */}
            {result.alternative_angles.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Alternative Angles
                  </CardTitle>
                  <CardDescription>
                    Other ways to approach this topic
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.alternative_angles.map((angle, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">→</span>
                        <span>{angle}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Summary & Action */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{result.summary}</p>

                <Separator />

                <Button
                  className="w-full"
                  onClick={handleContinueToDraft}
                >
                  Continue to Draft
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !result && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground text-center">
              Generating your outline...
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
