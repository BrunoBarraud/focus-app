"use client";

import * as React from "react";
import { MapPin, Repeat } from "lucide-react";
import { DAY_SHORT } from "@/lib/calendar-view";
import { weekdayKey } from "@/lib/recurrence";
import { assignLanes, rowOffset, toMinutes, type TimeSlot } from "@/lib/timetable";
import type { Calendar, PlannerOccurrence } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isTempId } from "./useCalendar";
import { paletteFor, TaskCheck, timeRange, useNowMinutes } from "./shared";

interface TimeGridViewProps {
  days: string[];
  today: string;
  occurrences: PlannerOccurrence[];
  calendarById: Map<string, Calendar>;
  slots: TimeSlot[];
  /** "slots" = bloques tipo facultad (filas más altas, etiquetas de rango). */
  mode: "hours" | "slots";
  onCreate: (date: string, slot?: TimeSlot, allDay?: boolean) => void;
  onOpen: (occ: PlannerOccurrence) => void;
  onToggle: (occ: PlannerOccurrence) => void;
  onOpenDay: (date: string) => void;
}

/** Vista Día / Semana: columnas por día y filas por hora o por bloque. */
export function TimeGridView({
  days,
  today,
  occurrences,
  calendarById,
  slots,
  mode,
  onCreate,
  onOpen,
  onToggle,
  onOpenDay,
}: TimeGridViewProps) {
  const rowHeight = mode === "slots" ? 64 : 52;
  const nowMinutes = useNowMinutes();
  const nowOffset = rowOffset(slots, nowMinutes);
  const single = days.length === 1;

  // Arriba: todo el día, sin hora y lo que dura varios días.
  const isBanner = (o: PlannerOccurrence) => o.allDay || !o.startTime || o.occurrenceEndDate !== o.occurrenceDate;
  const bannerByDay = new Map<string, PlannerOccurrence[]>();
  const timedByDay = new Map<string, PlannerOccurrence[]>();
  for (const day of days) {
    bannerByDay.set(day, []);
    timedByDay.set(day, []);
  }
  const outside: PlannerOccurrence[] = [];
  for (const occ of occurrences) {
    if (isBanner(occ)) {
      for (const day of days) if (occ.occurrenceDate <= day && occ.occurrenceEndDate >= day) bannerByDay.get(day)!.push(occ);
    } else if (timedByDay.has(occ.occurrenceDate)) {
      const start = rowOffset(slots, toMinutes(occ.startTime!));
      if (start === null) outside.push(occ);
      else timedByDay.get(occ.occurrenceDate)!.push(occ);
    }
  }
  const hasBanners = [...bannerByDay.values()].some((l) => l.length > 0);

  const columns = `${mode === "slots" ? 116 : 56}px repeat(${days.length}, minmax(${single ? 0 : 96}px, 1fr))`;

  return (
    <div className="space-y-2">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 overflow-x-auto">
        <div style={{ display: "grid", gridTemplateColumns: columns }} className={cn(!single && "min-w-[760px]")}>
          {/* Encabezado */}
          <div className="sticky left-0 z-20 bg-zinc-900 border-b border-zinc-800" />
          {days.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => onOpenDay(day)}
              className={cn(
                "border-b border-l border-zinc-800 px-2 py-2 text-center cursor-pointer hover:bg-white/[0.03]",
                day === today ? "bg-violet-500/15" : "bg-zinc-900"
              )}
            >
              <span className={cn("block text-[11px] font-semibold uppercase tracking-wider", day === today ? "text-violet-300" : "text-zinc-400")}>
                {DAY_SHORT[weekdayKey(day)]}
              </span>
              <span
                className={cn(
                  "mt-0.5 inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-base font-bold",
                  day === today ? "bg-violet-600 text-white" : "text-zinc-100"
                )}
              >
                {Number(day.slice(8, 10))}
              </span>
            </button>
          ))}

          {/* Fila de todo el día */}
          <div className="sticky left-0 z-10 bg-zinc-950 border-b border-zinc-800 px-2 py-1.5 text-[11px] text-zinc-500 flex items-start">
            Todo el día
          </div>
          {days.map((day) => (
            <div
              key={day}
              className={cn("border-b border-l border-zinc-800 p-1 space-y-1", hasBanners ? "min-h-9" : "min-h-7")}
              onDoubleClick={() => onCreate(day, undefined, true)}
            >
              {bannerByDay.get(day)!.map((occ) => {
                const color = paletteFor(occ, calendarById);
                return (
                  <button
                    key={`${occ.id}-${occ.occurrenceDate}`}
                    type="button"
                    onClick={() => onOpen(occ)}
                    disabled={isTempId(occ.id)}
                    className={cn(
                      "w-full flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-left text-xs font-medium truncate cursor-pointer",
                      color.block,
                      occ.completed && "opacity-50 line-through"
                    )}
                  >
                    {occ.kind === "task" && <TaskCheck occ={occ} onToggle={onToggle} className="h-3.5 w-3.5" />}
                    <span className="truncate">{occ.title}</span>
                  </button>
                );
              })}
            </div>
          ))}

          {/* Columna de horas / bloques */}
          <div className="sticky left-0 z-10 bg-zinc-950">
            {slots.map((slot) => (
              <div
                key={slot.index}
                style={{ height: rowHeight }}
                className={cn(
                  "border-b border-zinc-800/70 px-2 text-[11px] font-mono text-zinc-400 whitespace-nowrap",
                  mode === "slots" ? "flex items-center" : "pt-1 text-right"
                )}
              >
                {mode === "slots" ? `${slot.start} – ${slot.end}` : slot.start}
              </div>
            ))}
          </div>

          {/* Días */}
          {days.map((day) => {
            const timed = timedByDay.get(day)!;
            const ranges = timed.map((occ) => {
              const start = rowOffset(slots, toMinutes(occ.startTime!))!;
              const endRaw = occ.endTime ? rowOffset(slots, toMinutes(occ.endTime)) : null;
              const end = Math.max(start + 0.5, endRaw ?? (occ.endTime ? slots.length : start + (mode === "slots" ? 1 : 0.5)));
              return { occ, start, end: Math.min(end, slots.length) };
            });
            const lanes = assignLanes(ranges.map((r) => ({ id: `${r.occ.id}-${r.occ.occurrenceDate}`, start: r.start, end: r.end })));

            return (
              <div
                key={day}
                className={cn("relative border-l border-zinc-800", day === today && "bg-violet-500/[0.04]")}
                style={{ height: slots.length * rowHeight }}
              >
                {slots.map((slot) => (
                  <button
                    key={slot.index}
                    type="button"
                    onClick={() => onCreate(day, slot)}
                    aria-label={`Nuevo evento el ${day} a las ${slot.start}`}
                    className="absolute inset-x-0 border-b border-zinc-800/70 hover:bg-white/[0.03] cursor-pointer"
                    style={{ top: slot.index * rowHeight, height: rowHeight }}
                  />
                ))}

                {day === today && nowOffset !== null && (
                  <div className="absolute inset-x-0 z-[5] pointer-events-none" style={{ top: nowOffset * rowHeight }}>
                    <div className="h-px bg-rose-500" />
                    <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-rose-500" />
                  </div>
                )}

                {ranges.map(({ occ, start, end }) => {
                  const key = `${occ.id}-${occ.occurrenceDate}`;
                  const { lane, lanes: total } = lanes.get(key) ?? { lane: 0, lanes: 1 };
                  const color = paletteFor(occ, calendarById);
                  const height = (end - start) * rowHeight - 4;
                  const compact = height < 44;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onOpen(occ)}
                      disabled={isTempId(occ.id)}
                      title={`${occ.title} · ${timeRange(occ)}${occ.location ? ` · ${occ.location}` : ""}`}
                      className={cn(
                        "absolute z-10 rounded-lg border px-1.5 py-1 text-left shadow-sm overflow-hidden hover:brightness-110 transition cursor-pointer",
                        mode === "slots" && "text-center",
                        color.block,
                        occ.completed && "opacity-50",
                        isTempId(occ.id) && "opacity-60"
                      )}
                      style={{
                        top: start * rowHeight + 2,
                        height,
                        left: `calc(${(lane / total) * 100}% + 3px)`,
                        width: `calc(${100 / total}% - 6px)`,
                      }}
                    >
                      <span className={cn("flex items-start gap-1", mode === "slots" && "justify-center")}>
                        {occ.kind === "task" && <TaskCheck occ={occ} onToggle={onToggle} className="mt-0.5" />}
                        <span
                          className={cn(
                            "text-xs font-semibold leading-tight",
                            compact ? "line-clamp-1" : "line-clamp-3",
                            occ.completed && "line-through"
                          )}
                        >
                          {occ.title}
                          {occ.tag && occ.tag !== "General" && mode === "slots" && (
                            <span className="block font-normal opacity-90">({occ.tag})</span>
                          )}
                        </span>
                      </span>
                      {!compact && (
                        <span className={cn("mt-0.5 flex items-center gap-1 text-[11px] opacity-85 font-mono", mode === "slots" && "justify-center")}>
                          {occ.recurrence && <Repeat className="h-3 w-3 shrink-0" />}
                          {timeRange(occ)}
                        </span>
                      )}
                      {height >= 80 && occ.location && (
                        <span className="mt-0.5 flex items-center gap-1 text-[11px] opacity-85 truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {occ.location}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {outside.length > 0 && (
        <p className="text-xs text-amber-300/90">
          Fuera de la grilla:{" "}
          {outside.map((o, i) => (
            <button key={`${o.id}-${o.occurrenceDate}`} type="button" onClick={() => onOpen(o)} className="underline cursor-pointer">
              {o.title} ({o.startTime}){i < outside.length - 1 ? ", " : ""}
            </button>
          ))}
          . Cambiá la grilla a “Horas” o ajustá los bloques del calendario para verlos.
        </p>
      )}
    </div>
  );
}
