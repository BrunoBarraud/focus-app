"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, datesBetween, DAY_SHORT, MONTHS, rangeFor } from "@/lib/calendar-view";
import { WEEK_DAYS } from "@/lib/dates";
import { cn } from "@/lib/utils";

interface MiniMonthProps {
  selected: string;
  today: string;
  /** Fechas con algo cargado (se marcan con un punto). */
  busy: ReadonlySet<string>;
  /** Rango resaltado (la semana o el día que se está viendo). */
  highlight: { from: string; to: string };
  onSelect: (date: string) => void;
}

/** Mini calendario para saltar a cualquier fecha. */
export function MiniMonth({ selected, today, busy, highlight, onSelect }: MiniMonthProps) {
  const [shown, setShown] = React.useState(selected.slice(0, 7));
  const [lastSelected, setLastSelected] = React.useState(selected);
  if (selected !== lastSelected) {
    setLastSelected(selected);
    setShown(selected.slice(0, 7));
  }

  const anchor = `${shown}-01`;
  const { from, to } = rangeFor("month", anchor);
  const [y, m] = shown.split("-").map(Number);

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-zinc-100 first-letter:uppercase">
          {MONTHS[m - 1]} {y}
        </span>
        <div className="flex">
          <button
            type="button"
            onClick={() => setShown(addMonths(anchor, -1).slice(0, 7))}
            aria-label="Mes anterior"
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setShown(addMonths(anchor, 1).slice(0, 7))}
            aria-label="Mes siguiente"
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center">
        {WEEK_DAYS.map((d) => (
          <span key={d} className="text-[10px] font-semibold uppercase text-zinc-500 pb-1">
            {DAY_SHORT[d].slice(0, 2)}
          </span>
        ))}
        {datesBetween(from, to).map((day) => {
          const inMonth = day.startsWith(shown);
          const highlighted = day >= highlight.from && day <= highlight.to;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelect(day)}
              className={cn(
                "relative h-8 text-xs rounded-md cursor-pointer transition-colors",
                highlighted && "bg-violet-500/15",
                day === today
                  ? "font-bold text-violet-300"
                  : inMonth
                    ? "text-zinc-200 hover:bg-zinc-800"
                    : "text-zinc-600 hover:bg-zinc-900",
                day === selected && "ring-1 ring-violet-500"
              )}
            >
              {Number(day.slice(8, 10))}
              {busy.has(day) && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-violet-400" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
