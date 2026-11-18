"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { PALETTE, normalizeColor } from "@/lib/colors";
import type { Calendar, PlannerOccurrence } from "@/lib/types";
import { cn } from "@/lib/utils";

export function paletteFor(occ: Pick<PlannerOccurrence, "color" | "calendarId">, calendarById: Map<string, Calendar>) {
  return PALETTE[normalizeColor(occ.color ?? calendarById.get(occ.calendarId)?.color)];
}

export function timeRange(occ: Pick<PlannerOccurrence, "allDay" | "startTime" | "endTime">): string {
  if (occ.allDay || !occ.startTime) return "";
  return occ.endTime ? `${occ.startTime}–${occ.endTime}` : occ.startTime;
}

/** Círculo para tildar una tarea (no propaga el clic al bloque). */
export function TaskCheck({
  occ,
  onToggle,
  className,
}: {
  occ: PlannerOccurrence;
  onToggle: (occ: PlannerOccurrence) => void;
  className?: string;
}) {
  return (
    <span
      role="checkbox"
      tabIndex={0}
      aria-checked={occ.completed}
      aria-label={occ.completed ? `Marcar "${occ.title}" como pendiente` : `Marcar "${occ.title}" como hecha`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(occ);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onToggle(occ);
        }
      }}
      className={cn(
        "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border cursor-pointer transition-colors",
        occ.completed ? "bg-white/90 border-white text-zinc-900" : "border-current opacity-80 hover:opacity-100",
        className
      )}
    >
      {occ.completed && <Check className="h-3 w-3" strokeWidth={3} />}
    </span>
  );
}

/** Ícono (emoji) o punto de color de un calendario. */
export function CalendarBadge({ calendar, className }: { calendar: Calendar; className?: string }) {
  if (calendar.icon) return <span className={cn("text-sm leading-none", className)}>{calendar.icon}</span>;
  return <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", PALETTE[normalizeColor(calendar.color)].dot, className)} />;
}

export function useNowMinutes() {
  const [now, setNow] = React.useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });
  React.useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setNow(d.getHours() * 60 + d.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}
