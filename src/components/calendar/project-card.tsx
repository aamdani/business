"use client";

import Link from "next/link";
import type { ContentProjectWithSummary, ProjectStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

// Status configuration
const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; dotClass: string; textClass: string }
> = {
  draft: {
    label: "Draft",
    dotClass: "bg-stone-400",
    textClass: "text-stone-500 dark:text-stone-500",
  },
  review: {
    label: "Review",
    dotClass: "bg-amber-400",
    textClass: "text-amber-600 dark:text-amber-500",
  },
  scheduled: {
    label: "Scheduled",
    dotClass: "bg-yellow-400",
    textClass: "text-yellow-600 dark:text-yellow-500",
  },
  published: {
    label: "Published",
    dotClass: "bg-emerald-400",
    textClass: "text-emerald-600 dark:text-emerald-500",
  },
};

// Format date for display
function formatDate(dateString: string | null): string {
  if (!dateString) return "Unscheduled";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Format date for empty card
function formatDateFull(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// Extract first N words from text
function truncateWords(text: string | null | undefined, wordCount: number): string {
  if (!text) return "";
  // Strip HTML tags if present
  const stripped = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const words = stripped.split(/\s+/);
  if (words.length <= wordCount) return stripped;
  return words.slice(0, wordCount).join(" ") + "...";
}

interface ProjectCardProps {
  project: ContentProjectWithSummary;
  variant?: "compact" | "full";
}

export function ProjectCard({ project, variant = "compact" }: ProjectCardProps) {
  const statusConfig = STATUS_CONFIG[project.status];
  // Use content_summary (from assets) if available, otherwise fall back to notes
  const summary = truncateWords(project.content_summary || project.notes, 75);

  if (variant === "compact") {
    // Compact card for month view
    return (
      <Link
        href={`/projects/${project.id}`}
        className={cn(
          "block rounded-lg transition-all duration-200",
          "bg-amber-50/80 dark:bg-amber-950/30",
          "border-l-3 border-l-yellow-400",
          "hover:bg-amber-100/80 dark:hover:bg-amber-900/40",
          "hover:shadow-sm",
          "px-2.5 py-1.5"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusConfig.dotClass)}
            aria-label={statusConfig.label}
          />
          <p className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate">
            {project.title}
          </p>
        </div>
      </Link>
    );
  }

  // Full card for gallery view - portrait, paper-like aspect ratio
  return (
    <Link
      href={`/projects/${project.id}`}
      className={cn(
        "flex flex-col h-full rounded-xl transition-all duration-200",
        "bg-linear-to-br from-amber-50 to-yellow-50/50",
        "dark:from-amber-950/40 dark:to-yellow-950/20",
        "border border-amber-200/60 dark:border-amber-800/40",
        "hover:shadow-lg hover:shadow-amber-200/50 dark:hover:shadow-amber-900/40",
        "hover:border-yellow-300 dark:hover:border-yellow-700",
        "hover:-translate-y-0.5",
        "p-5 overflow-hidden"
      )}
    >
      {/* Date at top */}
      <p className="text-xs font-medium text-yellow-700 dark:text-yellow-500 uppercase tracking-wide mb-3">
        {formatDate(project.scheduled_date)}
      </p>

      {/* Title */}
      <h3 className="font-semibold text-stone-900 dark:text-stone-100 leading-snug mb-3 line-clamp-2">
        {project.title}
      </h3>

      {/* Summary - main content area */}
      <div className="flex-1 min-h-0">
        {summary ? (
          <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed line-clamp-6">
            {summary}
          </p>
        ) : (
          <p className="text-sm text-stone-400 dark:text-stone-600 italic">
            No content yet
          </p>
        )}
      </div>

      {/* Status at bottom - very small */}
      <div className="mt-4 pt-3 border-t border-amber-200/40 dark:border-amber-800/30">
        <span className={cn("text-[10px] font-medium uppercase tracking-wider", statusConfig.textClass)}>
          {statusConfig.label}
        </span>
      </div>
    </Link>
  );
}

// Empty card for days with no content scheduled
interface EmptyDayCardProps {
  date: string;
}

export function EmptyDayCard({ date }: EmptyDayCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col h-full rounded-xl",
        "bg-stone-50/50 dark:bg-stone-900/30",
        "border border-dashed border-stone-300 dark:border-stone-700",
        "p-5"
      )}
    >
      {/* Date at top */}
      <p className="text-xs font-medium text-stone-500 dark:text-stone-500 uppercase tracking-wide mb-3">
        {formatDateFull(date)}
      </p>

      {/* Empty state */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <p className="text-sm text-stone-400 dark:text-stone-600 mb-4">
          No content scheduled
        </p>
        <Button
          variant="outline"
          size="sm"
          asChild
          className="border-yellow-400 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-600 dark:text-yellow-500 dark:hover:bg-yellow-950/30"
        >
          <Link href={`/projects/new?date=${date}`}>
            <Plus className="h-4 w-4 mr-1" />
            Add project
          </Link>
        </Button>
      </div>
    </div>
  );
}

export { STATUS_CONFIG };
