"use client";

import * as React from "react";
import { DAY_SHORT } from "@/lib/calendar-view";
import { WEEK_DAYS } from "@/lib/dates";
import type { Calendar, PlannerOccurrence } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isTempId } from "./useCalendar";
import { paletteFor, TaskCheck } from "./shared";

interface MonthViewProps {
  days: string[]; // 42 fechas, de lunes a domingo
  month: string; // "YYYY-MM" del mes que se muestra
  today: string;
  occurrences: PlannerOccurrence[];
  calendarById: Map<string, Calendar>;
  onCreate: (date: string) => void;
  onOpen: (occ: PlannerOccurrence) => void;
  onToggle: (occ: PlannerOccurrence) => void;
  onOpenDay: (date: string) => void;
}

const MAX_CHIPS = 3;

export function MonthView({ days, month, today, occurrences, calendarById, onCreate, onOpen, onToggle, onOpenDay }: MonthViewProps) {
  const byDay = React.useMemo(() => {
    const map = new Map<string, PlannerOccurrence[]>(days.map((d) => [d, []]));
    for (const occ of occurrences) {
      for (const day of days) {
        if (occ.occurrenceDate <= day && occ.occurrenceEndDate >= day) map.get(day)!.push(occ);
      }
    }
    return map;
  }, [days, occurrences]);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 overflow-hidden">
      <div className="grid grid-cols-7 bg-zinc-900 border-b border-zinc-800">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            {DAY_SHORT[d]}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-6">
        {days.map((day) => {
          const items = byDay.get(day)!;
          const inMonth = day.startsWith(month);
          const isToday = day === today;
          return (
            <div
              key={day}
              role="button"
              tabIndex={0}
              onClick={() => onCreate(day)}
              onKeyDown={(e) => e.key === "Enter" && e.target === e.currentTarget && onCreate(day)}
              aria-label={`Nuevo evento el ${day}`}
              className={cn(
                "group min-h-[64px] sm:min-h-[108px] border-b border-r border-zinc-800/80 p-1 sm:p-1.5 text-left cursor-pointer hover:bg-white/[0.02] transition-colors",
                !inMonth && "bg-zinc-950/80"
              )}
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDay(day);
                  }}
                  className={cn(
                    "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold cursor-pointer hover:bg-zinc-800",
                    isToday ? "bg-violet-600 text-white hover:bg-violet-500" : inMonth ? "text-zinc-200" : "text-zinc-600"
                  )}
                  aria-label={`Ver el día ${day}`}
                >
                  {Number(day.slice(8, 10))}
                </button>
              </div>

              {/* Celular: puntos de color */}
              <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">
                {items.slice(0, 4).map((occ) => (
                  <span key={`${occ.id}-${occ.occurrenceDate}`} className={cn("h-1.5 w-1.5 rounded-full", paletteFor(occ, calendarById).dot)} />
                ))}
              </div>

              {/* Escritorio: chips */}
              <div className="mt-1 space-y-0.5 hidden sm:block">
                {items.slice(0, MAX_CHIPS).map((occ) => {
                  const color = paletteFor(occ, calendarById);
                  const solid = occ.allDay || occ.occurrenceEndDate !== occ.occurrenceDate;
                  return (
                    <button
                      key={`${occ.id}-${occ.occurrenceDate}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen(occ);
                      }}
                      disabled={isTempId(occ.id)}
                      className={cn(
                        "w-full flex items-center gap-1 rounded px-1 py-0.5 text-[11px] leading-tight text-left truncate border cursor-pointer",
                        solid ? color.block : color.soft,
                        occ.completed && "opacity-50 line-through"
                      )}
                    >
                      {occ.kind === "task" && <TaskCheck occ={occ} onToggle={onToggle} className="h-3 w-3" />}
                      {!solid && occ.startTime && <span className="font-mono opacity-80">{occ.startTime}</span>}
                      <span className="truncate">{occ.title}</span>
                    </button>
                  );
                })}
                {items.length > MAX_CHIPS && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDay(day);
                    }}
                    className="text-[11px] text-zinc-400 hover:text-white px-1 cursor-pointer"
                  >
                    +{items.length - MAX_CHIPS} más
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
