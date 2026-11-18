"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Plus, Printer, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AGENDA_DAYS, datesBetween, rangeFor, stepAnchor, titleFor, type CalendarView } from "@/lib/calendar-view";
import { eventToInput } from "@/lib/event-input";
import { shiftDays } from "@/lib/recurrence";
import { buildHourSlots, buildSlots, fromMinutes, toMinutes, type TimeSlot } from "@/lib/timetable";
import type { Calendar, PlannerData, PlannerOccurrence } from "@/lib/types";
import { useToday } from "@/lib/use-today";
import type { EventInput } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { AgendaView } from "./AgendaView";
import { CalendarSettings } from "./CalendarSettings";
import { EventEditor } from "./EventEditor";
import { MiniMonth } from "./MiniMonth";
import { MonthView } from "./MonthView";
import { CalendarBadge } from "./shared";
import { TimeGridView } from "./TimeGridView";
import { useCalendar, type CalendarState } from "./useCalendar";

const VIEW_KEY = "focus:calendar-view";
const GRID_KEY = "focus:calendar-grid";
const VIEWS: { id: CalendarView; label: string }[] = [
  { id: "day", label: "Día" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mes" },
  { id: "agenda", label: "Agenda" },
];

function readStored<T extends string>(key: string, allowed: (v: string) => v is T, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value && allowed(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function store(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Sin almacenamiento: no se recuerda la preferencia.
  }
}

const isView = (v: string): v is CalendarView => VIEWS.some((x) => x.id === v);

export function CalendarApp({ initialData, initialRange }: { initialData: PlannerData; initialRange: { from: string; to: string } }) {
  const today = useToday();
  const cal = useCalendar(initialData, initialRange);
  // "Hoy" solo existe en el cliente (el servidor corre en UTC).
  if (!today) return <CalendarSkeleton />;
  return <CalendarBoard today={today} cal={cal} />;
}

function CalendarSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 w-72 rounded-xl bg-zinc-900" />
      <div className="h-[560px] rounded-2xl bg-zinc-900/60" />
    </div>
  );
}

type EditorState = { input: EventInput; eventId?: string } | null;
type SettingsState = { calendar?: Calendar } | null;

function CalendarBoard({ today, cal }: { today: string; cal: CalendarState }) {
  const [view, setViewState] = React.useState<CalendarView>(() =>
    readStored(VIEW_KEY, isView, window.matchMedia("(max-width: 640px)").matches ? "day" : "week")
  );
  const [anchor, setAnchor] = React.useState(today);
  const [grid, setGridState] = React.useState<string>(() => readStored(GRID_KEY, (v): v is string => Boolean(v), "auto"));
  const [agendaDays, setAgendaDays] = React.useState(AGENDA_DAYS);
  const [editor, setEditor] = React.useState<EditorState>(null);
  const [settings, setSettings] = React.useState<SettingsState>(null);
  const [showCalendars, setShowCalendars] = React.useState(false);

  const setView = (v: CalendarView) => {
    setViewState(v);
    store(VIEW_KEY, v);
  };
  const setGrid = (g: string) => {
    setGridState(g);
    store(GRID_KEY, g);
  };

  const range = view === "agenda" ? { from: anchor, to: shiftDays(anchor, agendaDays - 1) } : rangeFor(view, anchor);
  const days = datesBetween(range.from, range.to);
  const occurrences = cal.occurrences(range.from, range.to);

  const { ensureRange } = cal;
  React.useEffect(() => {
    ensureRange(range.from, range.to);
  }, [ensureRange, range.from, range.to]);

  // ------------------------------------------------------------------------------
  // Grilla de Día/Semana: por horas o por los bloques de un calendario.
  // ------------------------------------------------------------------------------
  const slotCalendars = cal.calendars.filter((c) => c.useSlots && !c.hidden);
  const timed = occurrences.filter((o) => !o.allDay && o.startTime && o.occurrenceEndDate === o.occurrenceDate);
  let gridCalendar: Calendar | undefined;
  if (grid !== "hours") {
    gridCalendar =
      grid === "auto"
        ? // Automático: bloques si todo lo que tiene hora en este rango es de calendarios con bloques.
          timed.length > 0 && timed.every((o) => cal.calendarById.get(o.calendarId)?.useSlots)
          ? cal.calendarById.get(timed[0].calendarId)
          : undefined
        : slotCalendars.find((c) => c.id === grid);
  }
  let slots: TimeSlot[];
  if (gridCalendar) {
    slots = buildSlots(gridCalendar.schedule);
  } else {
    const starts = timed.map((o) => toMinutes(o.startTime!));
    const ends = timed.map((o) => toMinutes(o.endTime ?? o.startTime!) + 30);
    const fromHour = Math.max(0, Math.min(7, ...starts.map((m) => Math.floor(m / 60))));
    const toHour = Math.min(24, Math.max(22, ...ends.map((m) => Math.ceil(m / 60))));
    slots = buildHourSlots(fromHour, toHour);
  }

  // ------------------------------------------------------------------------------
  // Acciones
  // ------------------------------------------------------------------------------
  const defaultCalendarId = (preferred?: string) =>
    (preferred && cal.calendarById.has(preferred) ? preferred : undefined) ?? cal.firstCalendarId;

  const openNew = (date: string, slot?: TimeSlot, allDay = false) => {
    const nowHour = Math.min(22, new Date().getHours() + 1);
    const start = slot?.start ?? fromMinutes(nowHour * 60);
    const end = slot ? slot.end : fromMinutes(toMinutes(start) + 60);
    setEditor({
      input: {
        calendarId: defaultCalendarId(slot && gridCalendar ? gridCalendar.id : undefined),
        title: "",
        kind: "event",
        allDay,
        startDate: date,
        startTime: start,
        endTime: end,
        recurrence: null,
        reminders: null,
        color: null,
        priority: "medium",
      },
    });
  };

  const openExisting = (occ: PlannerOccurrence) => {
    const event = cal.events.find((e) => e.id === occ.id);
    if (event) setEditor({ input: eventToInput(event), eventId: event.id });
  };

  // "+ Nuevo": hoy si se está viendo; si no, el primer día de lo que se ve (ej. diciembre → 1/12).
  const viewingToday = today >= range.from && today <= range.to && (view !== "month" || today.startsWith(anchor.slice(0, 7)));
  const newItemDate =
    view === "day" ? anchor : viewingToday ? today : view === "month" ? `${anchor.slice(0, 7)}-01` : view === "week" ? range.from : anchor;

  const goToDay = (date: string) => {
    setAnchor(date);
    setView("day");
  };

  // Atajos: ← → para moverse, T para hoy (si no se está escribiendo).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editor || settings) return;
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowLeft") setAnchor((a) => stepAnchor(view, a, -1));
      else if (e.key === "ArrowRight") setAnchor((a) => stepAnchor(view, a, 1));
      else if (e.key.toLowerCase() === "t") setAnchor(today);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, today, editor, settings]);

  const occurrencesIn = cal.occurrences;
  const busyDays = React.useMemo(() => {
    const set = new Set<string>();
    const monthRange = rangeFor("month", anchor);
    for (const occ of occurrencesIn(monthRange.from, monthRange.to)) set.add(occ.occurrenceDate);
    return set;
  }, [occurrencesIn, anchor]);

  const printHref = `/planificador/imprimir?${new URLSearchParams({
    fecha: anchor,
    vista: view === "month" ? "mes" : "semana",
    cal: cal.calendars.filter((c) => !c.hidden).map((c) => c.id).join(","),
  }).toString()}`;

  const calendarList = (
    <div className="space-y-1">
      {cal.calendars.map((c) => (
        <div key={c.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.03]">
          <input
            type="checkbox"
            checked={!c.hidden}
            onChange={(e) => cal.setCalendarHidden(c.id, !e.target.checked)}
            aria-label={`Mostrar ${c.name}`}
            className="h-4 w-4 accent-violet-500 cursor-pointer"
          />
          <CalendarBadge calendar={c} />
          <span className={cn("flex-1 truncate text-sm", c.hidden ? "text-zinc-500" : "text-zinc-200")}>{c.name}</span>
          <button
            type="button"
            onClick={() => setSettings({ calendar: c })}
            aria-label={`Ajustes de ${c.name}`}
            className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 cursor-pointer"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setSettings({})}
        className="flex items-center gap-2 px-2 py-1.5 text-sm text-zinc-400 hover:text-white cursor-pointer"
      >
        <Plus className="h-4 w-4" /> Nuevo calendario
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Barra superior */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAnchor(today)}>
            Hoy
          </Button>
          <div className="flex">
            <button
              type="button"
              onClick={() => setAnchor((a) => stepAnchor(view, a, -1))}
              aria-label="Anterior"
              className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setAnchor((a) => stepAnchor(view, a, 1))}
              aria-label="Siguiente"
              className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-white first-letter:uppercase">{titleFor(view, anchor)}</h1>
          <label className="relative">
            <span className="sr-only">Ir a una fecha</span>
            <input
              type="date"
              value={anchor}
              onChange={(e) => e.target.value && setAnchor(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 focus:border-violet-500 focus:outline-none"
              title="Ir a una fecha"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                aria-pressed={view === v.id}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer",
                  view === v.id ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
          {(view === "week" || view === "day") && (
            <select
              value={grid}
              onChange={(e) => setGrid(e.target.value)}
              aria-label="Grilla"
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300 focus:border-violet-500 focus:outline-none"
            >
              <option value="auto">Grilla: automática</option>
              <option value="hours">Grilla: por horas</option>
              {cal.calendars
                .filter((c) => c.useSlots)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    Grilla: bloques de {c.name}
                  </option>
                ))}
            </select>
          )}
          <a
            href={printHref}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 h-8 text-xs text-zinc-200 hover:bg-zinc-800"
          >
            <Printer className="h-3.5 w-3.5" /> Imprimir / PDF
          </a>
          <Button variant="glow" size="sm" onClick={() => openNew(newItemDate)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Nuevo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-4">
        {/* Panel lateral */}
        <aside className="space-y-4">
          <div className="hidden lg:block rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
            <MiniMonth
              selected={anchor}
              today={today}
              busy={busyDays}
              highlight={view === "month" || view === "agenda" ? { from: anchor, to: anchor } : range}
              onSelect={setAnchor}
            />
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-2">
            <button
              type="button"
              onClick={() => setShowCalendars((s) => !s)}
              className="lg:hidden w-full flex items-center justify-between px-2 py-1 text-sm font-semibold text-zinc-200 cursor-pointer"
              aria-expanded={showCalendars}
            >
              Calendarios
              <ChevronRight className={cn("h-4 w-4 transition-transform", showCalendars && "rotate-90")} />
            </button>
            <p className="hidden lg:block px-2 pt-1 pb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">Calendarios</p>
            <div className={cn(showCalendars ? "block" : "hidden", "lg:block")}>{calendarList}</div>
          </div>
        </aside>

        {/* Vista */}
        <div className="min-w-0">
          {view === "month" && (
            <MonthView
              days={days}
              month={anchor.slice(0, 7)}
              today={today}
              occurrences={occurrences}
              calendarById={cal.calendarById}
              onCreate={(date) => openNew(date)}
              onOpen={openExisting}
              onToggle={cal.toggleCompletion}
              onOpenDay={goToDay}
            />
          )}
          {(view === "week" || view === "day") && (
            <TimeGridView
              days={days}
              today={today}
              occurrences={occurrences}
              calendarById={cal.calendarById}
              slots={slots}
              mode={gridCalendar ? "slots" : "hours"}
              onCreate={openNew}
              onOpen={openExisting}
              onToggle={cal.toggleCompletion}
              onOpenDay={goToDay}
            />
          )}
          {view === "agenda" && (
            <AgendaView
              days={days}
              today={today}
              occurrences={occurrences}
              calendarById={cal.calendarById}
              onOpen={openExisting}
              onToggle={cal.toggleCompletion}
              onLoadMore={() => setAgendaDays((n) => n + 30)}
            />
          )}
        </div>
      </div>

      {editor && (
        <EventEditor
          key={editor.eventId ?? `${editor.input.startDate}-${editor.input.startTime}`}
          initial={editor.input}
          isNew={!editor.eventId}
          calendars={cal.calendars}
          onClose={() => setEditor(null)}
          onSave={async (input) => (editor.eventId ? cal.updateEvent(editor.eventId, input) : Boolean(await cal.addEvent(input)))}
          onDelete={editor.eventId ? () => cal.deleteEvent(editor.eventId!) : undefined}
        />
      )}

      {settings && (
        <CalendarSettings
          key={settings.calendar?.id ?? "nuevo"}
          calendar={settings.calendar}
          calendarCount={cal.calendars.length}
          eventCount={settings.calendar ? cal.events.filter((e) => e.calendarId === settings.calendar!.id).length : 0}
          onClose={() => setSettings(null)}
          onSave={async (input) =>
            settings.calendar ? cal.updateCalendar(settings.calendar.id, input) : Boolean(await cal.addCalendar(input))
          }
          onDelete={settings.calendar ? () => cal.deleteCalendar(settings.calendar!.id) : undefined}
        />
      )}
    </div>
  );
}
