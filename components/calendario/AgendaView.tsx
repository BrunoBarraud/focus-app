"use client";

import * as React from "react";
import { CalendarX, Link2, MapPin, Repeat } from "lucide-react";
import { longDate } from "@/lib/calendar-view";
import type { Calendar, PlannerOccurrence } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isTempId } from "./useCalendar";
import { CalendarBadge, paletteFor, TaskCheck, timeRange } from "./shared";

interface AgendaViewProps {
  days: string[];
  today: string;
  occurrences: PlannerOccurrence[];
  calendarById: Map<string, Calendar>;
  onOpen: (occ: PlannerOccurrence) => void;
  onToggle: (occ: PlannerOccurrence) => void;
  onLoadMore: () => void;
}

/** Lista de lo que viene, agrupado por día (solo los días con algo). */
export function AgendaView({ days, today, occurrences, calendarById, onOpen, onToggle, onLoadMore }: AgendaViewProps) {
  const groups = days
    .map((day) => ({
      day,
      items: occurrences.filter((o) => o.occurrenceDate <= day && o.occurrenceEndDate >= day),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {groups.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-800 py-16 text-center">
          <CalendarX className="h-8 w-8 text-zinc-600 mx-auto" />
          <p className="text-sm text-zinc-300 mt-3">No hay nada en estos {days.length} días.</p>
        </div>
      )}

      {groups.map(({ day, items }) => (
        <section key={day} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 overflow-hidden">
          <h3
            className={cn(
              "px-4 py-2 text-sm font-semibold border-b border-zinc-800 first-letter:uppercase",
              day === today ? "bg-violet-500/15 text-violet-200" : "bg-zinc-900 text-zinc-200"
            )}
          >
            {day === today ? "Hoy · " : ""}
            {longDate(day, day.slice(0, 4) !== today.slice(0, 4))}
          </h3>
          <ul className="divide-y divide-zinc-800/80">
            {items.map((occ) => {
              const color = paletteFor(occ, calendarById);
              const calendar = calendarById.get(occ.calendarId);
              const multiDay = occ.occurrenceEndDate !== occ.occurrenceDate;
              return (
                <li key={`${occ.id}-${occ.occurrenceDate}`}>
                  <button
                    type="button"
                    onClick={() => onOpen(occ)}
                    disabled={isTempId(occ.id)}
                    className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-white/[0.03] cursor-pointer"
                  >
                    <span className="w-24 shrink-0 text-xs font-mono text-zinc-400 pt-0.5">
                      {occ.allDay || !occ.startTime ? (multiDay ? "Varios días" : "Todo el día") : timeRange(occ)}
                    </span>
                    <span className={cn("mt-1.5 h-2.5 w-2.5 rounded-full shrink-0", color.dot)} />
                    <span className="min-w-0 flex-1">
                      <span className={cn("flex items-center gap-2 text-sm font-medium text-zinc-100", occ.completed && "line-through text-zinc-500")}>
                        {occ.kind === "task" && <TaskCheck occ={occ} onToggle={onToggle} className="text-zinc-300" />}
                        <span className="truncate">{occ.title}</span>
                        {occ.recurrence && <Repeat className="h-3.5 w-3.5 text-zinc-500 shrink-0" />}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-400">
                        {calendar && (
                          <span className="flex items-center gap-1">
                            <CalendarBadge calendar={calendar} className="h-2 w-2 text-xs" />
                            {calendar.name}
                          </span>
                        )}
                        {occ.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {occ.location}
                          </span>
                        )}
                        {occ.url && (
                          <span className="flex items-center gap-1">
                            <Link2 className="h-3 w-3" />
                            Link
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <div className="text-center">
        <button type="button" onClick={onLoadMore} className="text-sm text-violet-300 hover:text-violet-200 cursor-pointer">
          Ver los 30 días siguientes
        </button>
      </div>
    </div>
  );
}
