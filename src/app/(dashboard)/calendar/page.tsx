"use client";

import { CalendarView } from "@/components/calendar/calendar-view";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Content Calendar</h1>
        <p className="text-muted-foreground">
          Plan and track your content across all platforms
        </p>
      </div>

      <CalendarView />
    </div>
  );
}
