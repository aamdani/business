"use client";

import { useMemo, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { DraggableProjectCard } from "./draggable-project-card";
import { ProjectCard, EmptyDayCard } from "./project-card";
import type { ContentProject, ContentProjectWithSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CalendarGridProps {
  projects: ContentProjectWithSummary[];
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

// Get days in current week
function getWeekDays(date: Date): Date[] {
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    days.push(day);
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

// Card item type for gallery - either a project or an empty day placeholder
type GalleryItem =
  | { type: "project"; project: ContentProjectWithSummary }
  | { type: "empty"; date: string };

// Gallery carousel for week view
interface GalleryCarouselProps {
  projects: ContentProjectWithSummary[];
  weekDays: Date[];
}

function GalleryCarousel({ projects, weekDays }: GalleryCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const cardsPerPage = 3;

  // Build gallery items: projects + empty day placeholders
  const galleryItems = useMemo(() => {
    const items: GalleryItem[] = [];
    const projectsByDate = new Map<string, ContentProjectWithSummary[]>();

    // Group projects by date
    projects.forEach((project) => {
      if (project.scheduled_date) {
        const dateKey = project.scheduled_date.split("T")[0];
        if (!projectsByDate.has(dateKey)) {
          projectsByDate.set(dateKey, []);
        }
        projectsByDate.get(dateKey)!.push(project);
      }
    });

    // Build items array in chronological order
    for (const day of weekDays) {
      const dateKey = formatDateKey(day);
      const dayProjects = projectsByDate.get(dateKey) || [];

      if (dayProjects.length === 0) {
        // Empty day - add placeholder
        items.push({ type: "empty", date: dateKey });
      } else {
        // Add all projects for this day
        for (const project of dayProjects) {
          items.push({ type: "project", project });
        }
      }
    }

    return items;
  }, [projects, weekDays]);

  const totalPages = Math.ceil(galleryItems.length / cardsPerPage);
  const currentPage = Math.floor(currentIndex / cardsPerPage);

  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex + cardsPerPage < galleryItems.length;

  const goBack = () => {
    setCurrentIndex(Math.max(0, currentIndex - cardsPerPage));
  };

  const goForward = () => {
    setCurrentIndex(Math.min(galleryItems.length - cardsPerPage, currentIndex + cardsPerPage));
  };

  const visibleItems = galleryItems.slice(currentIndex, currentIndex + cardsPerPage);

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

      {/* Cards grid - portrait aspect ratio (2:3, like paper) */}
      <div className="px-8">
        <div className="grid grid-cols-3 gap-5">
          {visibleItems.map((item, index) => (
            <div key={item.type === "project" ? item.project.id : `empty-${item.date}`} className="aspect-2/3">
              {item.type === "project" ? (
                <ProjectCard project={item.project} variant="full" />
              ) : (
                <EmptyDayCard date={item.date} />
              )}
            </div>
          ))}
          {/* Fill empty slots to maintain grid */}
          {visibleItems.length < cardsPerPage &&
            Array.from({ length: cardsPerPage - visibleItems.length }).map((_, i) => (
              <div key={`filler-${i}`} className="aspect-2/3" />
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
  const monthDays = useMemo(() => getMonthDays(currentDate), [currentDate]);
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  const projectsByDate = useMemo(() => {
    const grouped: Record<string, ContentProjectWithSummary[]> = {};

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
        <GalleryCarousel projects={projects} weekDays={weekDays} />
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
        {monthDays.map((day, i) => {
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
