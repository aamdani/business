"use client";

import { useMemo, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { DraggableProjectCard } from "./draggable-project-card";
import { ProjectCard } from "./project-card";
import type { ContentProject } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CalendarGridProps {
  projects: ContentProject[];
  viewMode: "month" | "week";
  currentDate: Date;
}

// Get days in month grid (includes prev/next month padding)
function getMonthDays(date: Date): Date[] {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const endDate = new Date(lastDay);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const days: Date[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function isCurrentMonth(date: Date, currentDate: Date): boolean {
  return date.getMonth() === currentDate.getMonth();
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Droppable day cell for month view
interface DroppableDayMonthProps {
  date: Date;
  projects: ContentProject[];
  inCurrentMonth: boolean;
}

function DroppableDayMonth({ date, projects, inCurrentMonth }: DroppableDayMonthProps) {
  const dateKey = formatDateKey(date);
  const { setNodeRef, isOver } = useDroppable({
    id: dateKey,
    data: { date: dateKey, type: "calendar-day" },
  });

  const today = isToday(date);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-25 p-1.5 border-r border-b border-stone-200 dark:border-stone-800 last:border-r-0",
        "overflow-hidden",
        !inCurrentMonth && "bg-stone-50/50 dark:bg-stone-900/30",
        today && "bg-yellow-50/50 dark:bg-yellow-950/20",
        isOver && "ring-2 ring-yellow-400 ring-inset bg-yellow-50/80 dark:bg-yellow-950/40"
      )}
    >
      <div
        className={cn(
          "text-xs font-medium mb-1.5 px-1",
          today
            ? "text-yellow-700 dark:text-yellow-400 font-semibold"
            : inCurrentMonth
              ? "text-stone-700 dark:text-stone-300"
              : "text-stone-400 dark:text-stone-600"
        )}
      >
        {date.getDate()}
      </div>

      <div className="space-y-1 overflow-hidden">
        {projects.slice(0, 3).map((project) => (
          <DraggableProjectCard key={project.id} project={project} variant="compact" />
        ))}
        {projects.length > 3 && (
          <p className="text-[10px] text-stone-500 dark:text-stone-500 px-1 font-medium">
            +{projects.length - 3} more
          </p>
        )}
      </div>
    </div>
  );
}

// Gallery carousel for week view
interface GalleryCarouselProps {
  projects: ContentProject[];
}

function GalleryCarousel({ projects }: GalleryCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const cardsPerPage = 3;

  // Sort projects by scheduled_date
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      if (!a.scheduled_date && !b.scheduled_date) return 0;
      if (!a.scheduled_date) return 1;
      if (!b.scheduled_date) return -1;
      return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
    });
  }, [projects]);

  const totalPages = Math.ceil(sortedProjects.length / cardsPerPage);
  const currentPage = Math.floor(currentIndex / cardsPerPage);

  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex + cardsPerPage < sortedProjects.length;

  const goBack = () => {
    setCurrentIndex(Math.max(0, currentIndex - cardsPerPage));
  };

  const goForward = () => {
    setCurrentIndex(Math.min(sortedProjects.length - cardsPerPage, currentIndex + cardsPerPage));
  };

  const visibleProjects = sortedProjects.slice(currentIndex, currentIndex + cardsPerPage);

  if (sortedProjects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-stone-400 dark:text-stone-600">
        <p>No content scheduled for this period</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Arrow buttons */}
      <Button
        variant="outline"
        size="icon"
        onClick={goBack}
        disabled={!canGoBack}
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10",
          "h-10 w-10 rounded-full shadow-md",
          "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700",
          "hover:bg-yellow-50 hover:border-yellow-300 dark:hover:bg-yellow-950/50",
          "disabled:opacity-30 disabled:cursor-not-allowed"
        )}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        onClick={goForward}
        disabled={!canGoForward}
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10",
          "h-10 w-10 rounded-full shadow-md",
          "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700",
          "hover:bg-yellow-50 hover:border-yellow-300 dark:hover:bg-yellow-950/50",
          "disabled:opacity-30 disabled:cursor-not-allowed"
        )}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>

      {/* Cards grid */}
      <div className="px-8">
        <div className="grid grid-cols-3 gap-5">
          {visibleProjects.map((project) => (
            <div key={project.id} className="h-64">
              <ProjectCard project={project} variant="full" />
            </div>
          ))}
          {/* Fill empty slots to maintain grid */}
          {visibleProjects.length < cardsPerPage &&
            Array.from({ length: cardsPerPage - visibleProjects.length }).map((_, i) => (
              <div key={`empty-${i}`} className="h-64" />
            ))}
        </div>
      </div>

      {/* Page indicators */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i * cardsPerPage)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-200",
                i === currentPage
                  ? "bg-yellow-400 w-6"
                  : "bg-stone-300 dark:bg-stone-700 hover:bg-yellow-300"
              )}
              aria-label={`Go to page ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CalendarGrid({ projects, viewMode, currentDate }: CalendarGridProps) {
  const days = useMemo(() => {
    return getMonthDays(currentDate);
  }, [currentDate]);

  const projectsByDate = useMemo(() => {
    const grouped: Record<string, ContentProject[]> = {};

    projects.forEach((project) => {
      if (project.scheduled_date) {
        const key = project.scheduled_date.split("T")[0];
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(project);
      }
    });

    return grouped;
  }, [projects]);

  // Week view = Gallery carousel
  if (viewMode === "week") {
    return (
      <div className="py-4">
        <GalleryCarousel projects={projects} />
      </div>
    );
  }

  // Month view = Traditional calendar grid
  return (
    <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden shadow-sm">
      <div className="grid grid-cols-7 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="p-2 text-center text-xs font-medium text-stone-500 dark:text-stone-500 border-r border-stone-200 dark:border-stone-800 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const dateKey = formatDateKey(day);
          const dayProjects = projectsByDate[dateKey] || [];
          const inCurrentMonth = isCurrentMonth(day, currentDate);

          return (
            <DroppableDayMonth
              key={i}
              date={day}
              projects={dayProjects}
              inCurrentMonth={inCurrentMonth}
            />
          );
        })}
      </div>
    </div>
  );
}
