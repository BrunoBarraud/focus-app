"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, MapPin, Plus, Repeat } from "lucide-react";
import { DAY_SHORT, longDate, rangeFor, datesBetween } from "@/lib/calendar-view";
import { shiftDays, weekdayKey } from "@/lib/recurrence";
import type { PlannerData, PlannerOccurrence } from "@/lib/types";
import { useToday } from "@/lib/use-today";
import type { EventInput } from "@/lib/validation";
import { eventToInput } from "@/lib/event-input";
import { cn } from "@/lib/utils";
import { EventEditor } from "@/components/calendario/EventEditor";
import { CalendarBadge, paletteFor, TaskCheck, timeRange } from "@/components/calendario/shared";
import { isTempId, useCalendar, type CalendarState } from "@/components/calendario/useCalendar";

const CARD_CLASS =
  "w-full rounded-[22px] border border-white/[0.08] bg-zinc-900/60 backdrop-blur-xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col";

interface TodayPanelProps {
  initialData: PlannerData;
  initialRange: { from: string; to: string };
}

/** Agenda del inicio: semana navegable + lo del día elegido + alta rápida. */
export function TodayPanel({ initialData, initialRange }: TodayPanelProps) {
  const today = useToday();
  const cal = useCalendar(initialData, initialRange);
  if (!today) return <div className={`${CARD_CLASS} min-h-[440px] animate-pulse`} />;
  return <Panel today={today} cal={cal} />;
}

function Panel({ today, cal }: { today: string; cal: CalendarState }) {
  const [selected, setSelected] = React.useState(today);
  const [title, setTitle] = React.useState("");
  const [time, setTime] = React.useState("");
  const [calendarId, setCalendarId] = React.useState(cal.firstCalendarId);
  const [editor, setEditor] = React.useState<{ input: EventInput; eventId?: string } | null>(null);
  const [saving, setSaving] = React.useState(false);

  const week = rangeFor("week", selected);
  const days = datesBetween(week.from, week.to);
  const weekItems = cal.occurrences(week.from, week.to);
  const dayItems = weekItems.filter((o) => o.occurrenceDate <= selected && o.occurrenceEndDate >= selected);
  const pendingTasks = dayItems.filter((o) => o.kind === "task" && !o.completed).length;

  const { ensureRange } = cal;
  React.useEffect(() => {
    ensureRange(week.from, week.to);
  }, [ensureRange, week.from, week.to]);

  const quickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    const created = await cal.addEvent({
      calendarId: calendarId || cal.firstCalendarId,
      title: title.trim(),
      kind: "task",
      allDay: false,
      startDate: selected,
      startTime: time || undefined,
      recurrence: null,
      reminders: null,
      color: null,
      priority: "medium",
    });
    setSaving(false);
    if (created) {
      setTitle("");
      setTime("");
    }
  };

  const openExisting = (occ: PlannerOccurrence) => {
    const event = cal.events.find((e) => e.id === occ.id);
    if (event) setEditor({ input: eventToInput(event), eventId: event.id });
  };

  const field =
    "rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none";

  return (
    <div className={cn(CARD_CLASS, "h-full gap-4")}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <CalendarDays className="h-5 w-5 text-violet-400" /> Agenda
        </h2>
        <Link href="/planificador" className="inline-flex items-center gap-1 text-xs font-semibold text-violet-300 hover:text-violet-200">
          Abrir planificador <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Semana navegable */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setSelected((d) => shiftDays(d, -7))}
          aria-label="Semana anterior"
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="grid flex-1 grid-cols-7 gap-1">
          {days.map((day) => {
            const count = weekItems.filter((o) => o.occurrenceDate <= day && o.occurrenceEndDate >= day).length;
            const isSelected = day === selected;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelected(day)}
                aria-pressed={isSelected}
                className={cn(
                  "flex flex-col items-center rounded-xl py-1.5 cursor-pointer transition-colors",
                  isSelected ? "bg-violet-600 text-white" : day === today ? "bg-violet-500/15 text-violet-200" : "text-zinc-300 hover:bg-zinc-800"
                )}
              >
                <span className="text-[10px] font-semibold uppercase">{DAY_SHORT[weekdayKey(day)]}</span>
                <span className="text-sm font-bold">{Number(day.slice(8, 10))}</span>
                <span className={cn("mt-0.5 h-1 w-1 rounded-full", count ? (isSelected ? "bg-white" : "bg-violet-400") : "bg-transparent")} />
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setSelected((d) => shiftDays(d, 7))}
          aria-label="Semana siguiente"
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-200 first-letter:uppercase">
          {selected === today ? "Hoy, " : ""}
          {longDate(selected, selected.slice(0, 4) !== today.slice(0, 4))}
        </p>
        <span className="flex items-center gap-3 text-xs text-zinc-500 shrink-0">
          {dayItems.length === 0
            ? "Libre"
            : pendingTasks
              ? `${pendingTasks} ${pendingTasks === 1 ? "tarea pendiente" : "tareas pendientes"}`
              : dayItems.some((o) => o.kind === "task")
                ? "Tareas hechas"
                : `${dayItems.length} ${dayItems.length === 1 ? "cosa" : "cosas"} en agenda`}
          {selected !== today && (
            <button type="button" onClick={() => setSelected(today)} className="text-violet-300 hover:text-violet-200 cursor-pointer">
              Volver a hoy
            </button>
          )}
        </span>
      </div>

      {/* Lo del día */}
      <ul className="flex-1 min-h-40 max-h-80 overflow-y-auto space-y-1.5 pr-1">
        {dayItems.length === 0 && (
          <li className="rounded-xl border border-dashed border-zinc-800 py-8 text-center text-sm text-zinc-500">Nada para este día.</li>
        )}
        {dayItems.map((occ) => {
          const color = paletteFor(occ, cal.calendarById);
          const calendar = cal.calendarById.get(occ.calendarId);
          return (
            <li key={`${occ.id}-${occ.occurrenceDate}`}>
              <button
                type="button"
                onClick={() => openExisting(occ)}
                disabled={isTempId(occ.id)}
                className="w-full flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2 text-left hover:border-zinc-700 cursor-pointer"
              >
                <span className={cn("h-8 w-1 rounded-full shrink-0", color.dot)} />
                {occ.kind === "task" && <TaskCheck occ={occ} onToggle={cal.toggleCompletion} className="text-zinc-300" />}
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-sm font-medium text-zinc-100", occ.completed && "line-through text-zinc-500")}>
                    {occ.title}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="font-mono">{occ.allDay || !occ.startTime ? "Todo el día" : timeRange(occ)}</span>
                    {calendar && (
                      <span className="flex items-center gap-1 truncate">
                        <CalendarBadge calendar={calendar} className="h-2 w-2 text-xs" />
                        {calendar.name}
                      </span>
                    )}
                    {occ.location && (
                      <span className="hidden sm:flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3" />
                        {occ.location}
                      </span>
                    )}
                  </span>
                </span>
                {occ.recurrence && <Repeat className="h-3.5 w-3.5 text-zinc-600 shrink-0" />}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Alta rápida */}
      <form onSubmit={quickAdd} className="flex flex-wrap gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nueva tarea para este día…"
          maxLength={200}
          aria-label="Nueva tarea"
          className={cn(field, "min-w-0 flex-1 basis-48")}
        />
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Hora (opcional)" className={cn(field, "w-28")} />
        {cal.calendars.length > 1 && (
          <select value={calendarId} onChange={(e) => setCalendarId(e.target.value)} aria-label="Calendario" className={cn(field, "max-w-40")}>
            {cal.calendars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon ? `${c.icon} ` : ""}
                {c.name}
              </option>
            ))}
          </select>
        )}
        <button
          type="submit"
          disabled={!title.trim() || saving}
          aria-label="Agregar"
          className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-3 text-white hover:bg-violet-500 disabled:opacity-40 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() =>
            setEditor({
              input: {
                calendarId: calendarId || cal.firstCalendarId,
                title: title.trim(),
                kind: "event",
                allDay: false,
                startDate: selected,
                startTime: time || "09:00",
                endTime: undefined,
                recurrence: null,
                reminders: null,
                color: null,
                priority: "medium",
              },
            })
          }
          className="text-xs text-zinc-400 hover:text-white cursor-pointer px-1"
        >
          Más opciones
        </button>
      </form>

      {editor && (
        <EventEditor
          key={editor.eventId ?? "nuevo"}
          initial={editor.input}
          isNew={!editor.eventId}
          calendars={cal.calendars}
          onClose={() => setEditor(null)}
          onSave={async (input) => {
            if (editor.eventId) return cal.updateEvent(editor.eventId, input);
            const created = await cal.addEvent(input);
            if (created) setTitle("");
            return Boolean(created);
          }}
          onDelete={editor.eventId ? () => cal.deleteEvent(editor.eventId!) : undefined}
        />
      )}
    </div>
  );
}
