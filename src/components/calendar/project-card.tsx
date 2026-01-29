"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { ContentProject, ProjectStatus } from "@/lib/types";
import { Youtube, FileText, Video } from "lucide-react";

// Status color configuration
const STATUS_CONFIG: Record<ProjectStatus, { label: string; bgClass: string }> = {
  draft: {
    label: "Draft",
    bgClass: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  },
  review: {
    label: "Review",
    bgClass: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  },
  scheduled: {
    label: "Scheduled",
    bgClass: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  published: {
    label: "Published",
    bgClass: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
};

// Platform icons
const PLATFORM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  youtube: Youtube,
  tiktok: Video,
  substack: FileText,
};

interface ProjectCardProps {
  project: ContentProject;
  variant?: "compact" | "full";
}

export function ProjectCard({ project, variant = "compact" }: ProjectCardProps) {
  const statusConfig = STATUS_CONFIG[project.status];
  const platforms = project.target_platforms || [];

  if (variant === "compact") {
    return (
      <Link
        href={`/projects/${project.id}`}
        className="block p-2 rounded-md hover:bg-accent transition-colors border border-border bg-card"
      >
        <div className="flex items-start justify-between gap-1">
          <p className="text-xs font-medium truncate flex-1 text-foreground">
            {project.title}
          </p>
          <Badge
            variant="secondary"
            className={`text-[10px] px-1 py-0 ${statusConfig.bgClass}`}
          >
            {statusConfig.label}
          </Badge>
        </div>
        {platforms.length > 0 && (
          <div className="flex gap-1 mt-1">
            {platforms.slice(0, 3).map((platform) => {
              const Icon = PLATFORM_ICONS[platform.toLowerCase()];
              return Icon ? (
                <Icon
                  key={platform}
                  className="h-3 w-3 text-muted-foreground"
                />
              ) : null;
            })}
          </div>
        )}
      </Link>
    );
  }

  // Full variant for week view
  return (
    <Link
      href={`/projects/${project.id}`}
      className="block p-3 rounded-lg hover:bg-accent transition-colors border border-border bg-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-foreground">
            {project.title}
          </p>
          {project.video_runtime && (
            <p className="text-xs text-muted-foreground mt-1">
              {project.video_runtime}
            </p>
          )}
        </div>
        <Badge variant="secondary" className={statusConfig.bgClass}>
          {statusConfig.label}
        </Badge>
      </div>
      {platforms.length > 0 && (
        <div className="flex gap-2 mt-2">
          {platforms.map((platform) => {
            const Icon = PLATFORM_ICONS[platform.toLowerCase()];
            return (
              <div
                key={platform}
                className="flex items-center gap-1 text-xs text-muted-foreground"
              >
                {Icon && <Icon className="h-3 w-3" />}
                <span className="capitalize">{platform}</span>
              </div>
            );
          })}
        </div>
      )}
      {project.notes && (
        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
          {project.notes}
        </p>
      )}
    </Link>
  );
}

export { STATUS_CONFIG };
