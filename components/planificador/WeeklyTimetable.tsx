"use client";

import * as React from "react";
import { Clock, Plus, Settings2, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CALENDAR_COLORS } from "@/lib/calendar-colors";
import { WEEK_DAYS, weekDates } from "@/lib/dates";
import {
  buildSlots,
  colorFor,
  layoutDay,
  slotRange,
  TIMETABLE_COLOR_KEYS,
  TIMETABLE_COLORS,
  toMinutes,
  type TimeSlot,
  type TimetableColor,
} from "@/lib/timetable";
import type { Calendar, CalendarSchedule, PlannerEvent, WeekDay } from "@/lib/types";
import type { TaskInput } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { isTempId } from "./usePlanner";

const DAY_NAMES: Record<WeekDay, string> = {
  L: "Lunes",
  M: "Martes",
  X: "Miércoles",
  J: "Jueves",
  V: "Viernes",
  S: "Sábado",
  D: "Domingo",
};

const TAG_SUGGESTIONS = ["Curso", "Teoría", "Práctica", "Laboratorio", "Com A", "Com B", "Consulta", "Parcial"];
const ROW_HEIGHT = 64; // px por bloque

interface WeeklyTimetableProps {
  today: string;
  events: PlannerEvent[];
  calendars: Calendar[];
  addTask: (input: TaskInput) => Promise<boolean>;
  updateTask: (eventId: string, input: TaskInput) => Promise<boolean>;
  deleteTask: (eventId: string) => Promise<void>;
  addCalendar: (name: string, color: string) => Promise<string | null>;
  updateCalendarSchedule: (calendarId: string, schedule: CalendarSchedule) => Promise<boolean>;
}

type ClassDraft = {
  id?: string;
  title: string;
  tag: string;
  description: string;
  days: WeekDay[];
  startTime: string;
  endTime: string;
  color: TimetableColor | "auto";
};

/** Calendario a mostrar primero: el que tenga más clases cargadas (o el de la facultad). */
function pickInitialCalendar(calendars: Calendar[], events: PlannerEvent[]): string | undefined {
  const counts = new Map<string, number>();
  for (const e of events) if (e.recurring && e.startTime) counts.set(e.calendarId, (counts.get(e.calendarId) ?? 0) + 1);
  const ranked = [...calendars].sort(
    (a, b) =>
      (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) ||
      Number(/facu|horario|clase/i.test(b.name)) - Number(/facu|horario|clase/i.test(a.name))
  );
  return ranked[0]?.id;
}

function useNowMinutes() {
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

/** Posición vertical (px) de una hora dentro de la grilla de bloques, o null si cae fuera. */
function offsetFor(slots: TimeSlot[], minutes: number): number | null {
  for (const slot of slots) {
    const s = toMinutes(slot.start);
    const e = toMinutes(slot.end);
    if (minutes >= s && minutes <= e) return slot.index * ROW_HEIGHT + ((minutes - s) / (e - s)) * ROW_HEIGHT;
  }
  return null;
}

export function WeeklyTimetable({
  today,
  events,
  calendars,
  addTask,
  updateTask,
  deleteTask,
  addCalendar,
  updateCalendarSchedule,
}: WeeklyTimetableProps) {
  const [calendarId, setCalendarId] = React.useState<string | undefined>(() => pickInitialCalendar(calendars, events));
  const calendar = calendars.find((c) => c.id === calendarId) ?? calendars[0];
  const slots = React.useMemo(() => (calendar ? buildSlots(calendar.schedule) : []), [calendar]);
  const calendarEvents = React.useMemo(
    () => events.filter((e) => e.calendarId === calendar?.id && e.recurring && e.startTime),
    [events, calendar]
  );

  const [showWeekend, setShowWeekend] = React.useState(false);
  const hasWeekendClasses = calendarEvents.some((e) => e.daysOfWeek.some((d) => d === "S" || d === "D"));
  const days = WEEK_DAYS.filter((d) => (d !== "S" && d !== "D") || showWeekend || hasWeekendClasses);
  const dates = weekDates(today);
  const todayDay = WEEK_DAYS[dates.indexOf(today)];
  const nowMinutes = useNowMinutes();
  const nowOffset = offsetFor(slots, nowMinutes);

  const outsideGrid = calendarEvents.filter((e) => !slotRange(slots, e.startTime!, e.endTime));

  const [draft, setDraft] = React.useState<ClassDraft | null>(null);
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [newCalendarName, setNewCalendarName] = React.useState<string | null>(null);

  const openNew = (day: WeekDay, slot?: TimeSlot) => {
    const first = slot ?? slots[0];
    setDraft({
      title: "",
      tag: "Curso",
      description: "",
      days: [day],
      startTime: first?.start ?? "08:00",
      endTime: first?.end ?? "09:00",
      color: "auto",
    });
  };

  const openEdit = (event: PlannerEvent) => {
    if (isTempId(event.id)) return;
    setDraft({
      id: event.id,
      title: event.title,
      tag: event.tag === "General" ? "" : event.tag,
      description: event.description ?? "",
      days: event.daysOfWeek,
      startTime: event.startTime ?? slots[0]?.start ?? "08:00",
      endTime: event.endTime ?? slots[0]?.end ?? "09:00",
      color: event.color && event.color in TIMETABLE_COLORS ? (event.color as TimetableColor) : "auto",
    });
  };

  const handleCreateCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCalendarName?.trim();
    if (!name) return;
    const createdId = await addCalendar(name, CALENDAR_COLORS[calendars.length % CALENDAR_COLORS.length]);
    if (createdId) {
      setNewCalendarName(null);
      setCalendarId(createdId);
    }
  };

  if (!calendar) {
    return <p className="text-sm text-zinc-400">Creá un calendario para armar tu horario.</p>;
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Calendarios + acciones */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {calendars.map((cal) => (
            <button
              key={cal.id}
              type="button"
              onClick={() => setCalendarId(cal.id)}
              aria-pressed={cal.id === calendar.id}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors cursor-pointer",
                cal.id === calendar.id
                  ? "bg-zinc-100 text-zinc-900 border-zinc-100"
                  : "border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-white"
              )}
            >
              <span className={cn("h-2.5 w-2.5 rounded-full", cal.color.split(" ")[0])} />
              {cal.name}
            </button>
          ))}
          {newCalendarName === null ? (
            <button
              type="button"
              onClick={() => setNewCalendarName("")}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed border-zinc-700 text-sm text-zinc-400 hover:text-white hover:border-zinc-500 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Calendario
            </button>
          ) : (
            <form onSubmit={handleCreateCalendar} className="flex items-center gap-1.5">
              <input
                autoFocus
                value={newCalendarName}
                onChange={(e) => setNewCalendarName(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setNewCalendarName(null)}
                maxLength={60}
                placeholder="Nombre del calendario"
                aria-label="Nombre del calendario"
                className="w-48 bg-zinc-900 border border-zinc-700 rounded-full px-3 py-1.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
              />
              <Button type="submit" size="sm" variant="glow">
                Crear
              </Button>
            </form>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!hasWeekendClasses && (
            <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer select-none mr-1">
              <input
                type="checkbox"
                checked={showWeekend}
                onChange={(e) => setShowWeekend(e.target.checked)}
                className="h-4 w-4 accent-violet-500"
              />
              Fin de semana
            </label>
          )}
          <Button variant="outline" size="sm" onClick={() => setScheduleOpen(true)} className="gap-1.5">
            <Settings2 className="h-3.5 w-3.5" /> Bloques
          </Button>
          <Button variant="glow" size="sm" onClick={() => openNew(todayDay ?? "L")} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Clase
          </Button>
        </div>
      </div>

      <p className="text-xs text-zinc-400 flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-violet-400" />
        Bloques de {calendar.schedule.slotMinutes} min desde las {calendar.schedule.start}
        {calendar.schedule.gapMinutes > 0 && `, con ${calendar.schedule.gapMinutes} min de corte`}. Tocá un casillero
        para agregar una clase. Las clases también aparecen en tus tareas de cada día y te avisan antes de empezar.
      </p>

      {/* Grilla */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 overflow-x-auto">
        <div className="min-w-[760px]" style={{ display: "grid", gridTemplateColumns: `124px repeat(${days.length}, minmax(0, 1fr))` }}>
          {/* Encabezado */}
          <div className="sticky left-0 z-20 bg-zinc-900 border-b border-zinc-800 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Horario
          </div>
          {days.map((day) => (
            <div
              key={day}
              className={cn(
                "border-b border-l border-zinc-800 px-2 py-2.5 text-center text-sm font-semibold",
                day === todayDay ? "bg-violet-500/15 text-violet-200" : "bg-zinc-900 text-zinc-200"
              )}
            >
              {DAY_NAMES[day]}
            </div>
          ))}

          {/* Columna de horarios */}
          <div className="sticky left-0 z-10 bg-zinc-950">
            {slots.map((slot) => (
              <div
                key={slot.index}
                style={{ height: ROW_HEIGHT }}
                className="border-b border-zinc-800/80 px-3 flex items-center whitespace-nowrap text-xs font-mono text-zinc-400"
              >
                {slot.start} – {slot.end}
              </div>
            ))}
          </div>

          {/* Días */}
          {days.map((day) => {
            const blocks = layoutDay(calendarEvents, slots, day);
            return (
              <div
                key={day}
                className={cn("relative border-l border-zinc-800", day === todayDay && "bg-violet-500/[0.04]")}
                style={{ height: slots.length * ROW_HEIGHT }}
              >
                {slots.map((slot) => (
                  <button
                    key={slot.index}
                    type="button"
                    onClick={() => openNew(day, slot)}
                    aria-label={`Agregar clase el ${DAY_NAMES[day].toLowerCase()} a las ${slot.start}`}
                    className="absolute inset-x-0 border-b border-zinc-800/80 hover:bg-white/[0.03] cursor-pointer group"
                    style={{ top: slot.index * ROW_HEIGHT, height: ROW_HEIGHT }}
                  >
                    <Plus className="h-4 w-4 text-zinc-600 mx-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}

                {day === todayDay && nowOffset !== null && (
                  <div className="absolute inset-x-0 z-[5] pointer-events-none" style={{ top: nowOffset }}>
                    <div className="h-px bg-rose-500" />
                    <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-rose-500" />
                  </div>
                )}

                {blocks.map(({ event, first, last, lane, lanes }) => {
                  const color = TIMETABLE_COLORS[colorFor(event)];
                  const height = (last - first + 1) * ROW_HEIGHT - 6;
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => openEdit(event)}
                      title={`${event.title}${event.tag && event.tag !== "General" ? ` (${event.tag})` : ""} · ${event.startTime}${event.endTime ? `–${event.endTime}` : ""}`}
                      className={cn(
                        "absolute z-10 rounded-lg border px-2 py-1.5 text-center shadow-sm overflow-hidden flex flex-col items-center justify-center gap-0.5 hover:brightness-110 transition cursor-pointer",
                        color.block,
                        isTempId(event.id) && "opacity-60 pointer-events-none"
                      )}
                      style={{
                        top: first * ROW_HEIGHT + 3,
                        height,
                        left: `calc(${(lane / lanes) * 100}% + 4px)`,
                        width: `calc(${100 / lanes}% - 8px)`,
                      }}
                    >
                      <span className={cn("text-[13px] font-semibold leading-tight", height < 70 ? "line-clamp-2" : "line-clamp-3")}>
                        {event.title}
                      </span>
                      {event.tag && event.tag !== "General" && (
                        <span className="text-xs leading-tight opacity-90">({event.tag})</span>
                      )}
                      {height >= 110 && (
                        <span className="text-[11px] font-mono opacity-80 mt-0.5">
                          {event.startTime}
                          {event.endTime && `–${event.endTime}`}
                        </span>
                      )}
                      {height >= 140 && event.description && (
                        <span className="text-[11px] opacity-80 line-clamp-1">{event.description}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {outsideGrid.length > 0 && (
        <p className="text-xs text-amber-300/90">
          {outsideGrid.length === 1 ? "Hay 1 clase" : `Hay ${outsideGrid.length} clases`} fuera de los bloques configurados (
          {outsideGrid.map((e) => `${e.title} ${e.startTime}`).join(", ")}). Ajustá los bloques para verlas en la grilla.
        </p>
      )}

      {draft && (
        <ClassDialog
          key={draft.id ?? `${draft.days.join("")}-${draft.startTime}`}
          draft={draft}
          slots={slots}
          onClose={() => setDraft(null)}
          onSave={async (d) => {
            const input: TaskInput = {
              calendarId: calendar.id,
              title: d.title,
              description: d.description || undefined,
              recurring: true,
              daysOfWeek: d.days,
              startTime: d.startTime,
              endTime: d.endTime,
              priority: "medium",
              estimatedMinutes: Math.max(5, toMinutes(d.endTime) - toMinutes(d.startTime)),
              tag: d.tag.trim() || undefined,
              // Automático: al crear no se manda nada; al editar, null borra el
              // color elegido antes.
              color: d.color !== "auto" ? d.color : d.id ? null : undefined,
            };
            const ok = d.id ? await updateTask(d.id, input) : await addTask(input);
            if (ok) setDraft(null);
          }}
          onDelete={
            draft.id
              ? async () => {
                  await deleteTask(draft.id!);
                  setDraft(null);
                }
              : undefined
          }
        />
      )}

      {scheduleOpen && (
        <ScheduleDialog
          key={calendar.id}
          calendar={calendar}
        onClose={() => setScheduleOpen(false)}
        onSave={async (schedule) => {
          const ok = await updateCalendarSchedule(calendar.id, schedule);
          if (ok) setScheduleOpen(false);
        }}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------
// Alta / edición de una clase
// ------------------------------------------------------------------------------

function ClassDialog({
  draft: initial,
  slots,
  onClose,
  onSave,
  onDelete,
}: {
  draft: ClassDraft;
  slots: TimeSlot[];
  onClose: () => void;
  onSave: (draft: ClassDraft) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [draft, setDraft] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const matchesSlots =
    slots.some((s) => s.start === initial.startTime) && slots.some((s) => s.end === initial.endTime);
  const [customTime, setCustomTime] = React.useState(!matchesSlots);
  const set = <K extends keyof ClassDraft>(key: K, value: ClassDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const toggleDay = (day: WeekDay) =>
    set("days", draft.days.includes(day) ? draft.days.filter((d) => d !== day) : [...draft.days, day]);

  const endOptions = slots.filter((s) => toMinutes(s.end) > toMinutes(draft.startTime));

  const handleStartChange = (start: string) => {
    // Si el fin queda antes del inicio, se mueve al final del mismo bloque.
    const slot = slots.find((s) => s.start === start);
    setDraft((d) => ({
      ...d,
      startTime: start,
      endTime: toMinutes(d.endTime) > toMinutes(start) ? d.endTime : slot?.end ?? d.endTime,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim()) return setError("Escribí el nombre de la materia.");
    if (draft.days.length === 0) return setError("Elegí al menos un día.");
    if (toMinutes(draft.endTime) <= toMinutes(draft.startTime)) return setError("La clase tiene que terminar después de empezar.");
    setError(null);
    setSaving(true);
    await onSave({ ...draft, title: draft.title.trim() });
    setSaving(false);
  };

  const fieldClass =
    "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none";

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={initial.id ? "Editar clase" : "Nueva clase"}
      description="Se repite todas las semanas en los días que elijas."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="sm:col-span-2 block">
            <span className="block text-xs font-medium text-zinc-400 mb-1">Materia</span>
            <input
              autoFocus
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              maxLength={200}
              placeholder="Ej: Redes y telecomunicaciones II"
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-zinc-400 mb-1">Tipo</span>
            <input
              value={draft.tag}
              onChange={(e) => set("tag", e.target.value)}
              list="timetable-tags"
              maxLength={40}
              placeholder="Curso, Com A…"
              className={fieldClass}
            />
            <datalist id="timetable-tags">
              {TAG_SUGGESTIONS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>
        </div>

        <div>
          <span className="block text-xs font-medium text-zinc-400 mb-1.5">Días</span>
          <div className="flex flex-wrap gap-1.5">
            {WEEK_DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                aria-pressed={draft.days.includes(day)}
                className={cn(
                  "px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer",
                  draft.days.includes(day)
                    ? "bg-violet-600 border-violet-500 text-white"
                    : "border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600"
                )}
              >
                {DAY_NAMES[day].slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-zinc-400">Horario</span>
            <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={customTime}
                onChange={(e) => setCustomTime(e.target.checked)}
                className="h-3.5 w-3.5 accent-violet-500"
              />
              Otro horario
            </label>
          </div>
          {customTime || slots.length === 0 ? (
            <div className="grid grid-cols-2 gap-3">
              <input
                type="time"
                aria-label="Empieza"
                value={draft.startTime}
                onChange={(e) => set("startTime", e.target.value)}
                className={fieldClass}
              />
              <input
                type="time"
                aria-label="Termina"
                value={draft.endTime}
                onChange={(e) => set("endTime", e.target.value)}
                className={fieldClass}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <select
                aria-label="Desde el bloque"
                value={draft.startTime}
                onChange={(e) => handleStartChange(e.target.value)}
                className={fieldClass}
              >
                {slots.map((s) => (
                  <option key={s.index} value={s.start}>
                    Desde {s.start}
                  </option>
                ))}
              </select>
              <select
                aria-label="Hasta el bloque"
                value={draft.endTime}
                onChange={(e) => set("endTime", e.target.value)}
                className={fieldClass}
              >
                {endOptions.map((s) => (
                  <option key={s.index} value={s.end}>
                    Hasta {s.end}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <label className="block">
          <span className="block text-xs font-medium text-zinc-400 mb-1">Aula o notas (opcional)</span>
          <input
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            maxLength={2000}
            placeholder="Ej: Aula 204, laboratorio 3"
            className={fieldClass}
          />
        </label>

        <div>
          <span className="block text-xs font-medium text-zinc-400 mb-1.5">Color</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => set("color", "auto")}
              aria-pressed={draft.color === "auto"}
              className={cn(
                "px-2.5 py-1 rounded-full border text-xs cursor-pointer",
                draft.color === "auto" ? "border-white text-white" : "border-zinc-700 text-zinc-400 hover:text-white"
              )}
            >
              Automático
            </button>
            {TIMETABLE_COLOR_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => set("color", key)}
                aria-label={TIMETABLE_COLORS[key].label}
                aria-pressed={draft.color === key}
                title={TIMETABLE_COLORS[key].label}
                className={cn(
                  "h-7 w-7 rounded-full border-2 cursor-pointer transition-transform",
                  TIMETABLE_COLORS[key].dot,
                  draft.color === key ? "border-white scale-110" : "border-transparent hover:scale-105"
                )}
              />
            ))}
          </div>
          {draft.color === "auto" && (
            <p className="text-xs text-zinc-500 mt-1.5">Todas las clases de la misma materia salen del mismo color.</p>
          )}
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <div className="flex items-center justify-between gap-2 pt-4 border-t border-zinc-800">
          {onDelete ? (
            <Button
              type="button"
              variant="ghost"
              disabled={saving}
              onClick={onDelete}
              className="gap-1.5 text-rose-400 hover:text-rose-300"
            >
              <Trash2 className="h-4 w-4" /> Eliminar
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="glow" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

// ------------------------------------------------------------------------------
// Configuración de bloques
// ------------------------------------------------------------------------------

function ScheduleDialog({
  calendar,
  onClose,
  onSave,
}: {
  calendar: Calendar;
  onClose: () => void;
  onSave: (schedule: CalendarSchedule) => Promise<void>;
}) {
  // Se monta al abrir: parte siempre de lo guardado.
  const [schedule, setSchedule] = React.useState(calendar.schedule);
  const [saving, setSaving] = React.useState(false);

  const preview = buildSlots(schedule);
  const valid =
    schedule.slotMinutes >= 10 &&
    schedule.slotMinutes <= 240 &&
    schedule.gapMinutes >= 0 &&
    schedule.gapMinutes <= 60 &&
    preview.length > 0;

  const fieldClass =
    "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none";

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Bloques de ${calendar.name}`}
      description="Definí a qué hora arranca el primer bloque, cuánto dura cada uno y el corte entre bloques."
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valid) return;
          setSaving(true);
          await onSave(schedule);
          setSaving(false);
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-zinc-400 mb-1">Primer bloque</span>
            <input
              type="time"
              value={schedule.start}
              onChange={(e) => setSchedule((s) => ({ ...s, start: e.target.value }))}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-zinc-400 mb-1">El día termina</span>
            <input
              type="time"
              value={schedule.end}
              onChange={(e) => setSchedule((s) => ({ ...s, end: e.target.value }))}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-zinc-400 mb-1">Duración de cada bloque (min)</span>
            <input
              type="number"
              min={10}
              max={240}
              value={schedule.slotMinutes}
              onChange={(e) => setSchedule((s) => ({ ...s, slotMinutes: Number(e.target.value) }))}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-zinc-400 mb-1">Corte entre bloques (min)</span>
            <input
              type="number"
              min={0}
              max={60}
              value={schedule.gapMinutes}
              onChange={(e) => setSchedule((s) => ({ ...s, gapMinutes: Number(e.target.value) }))}
              className={fieldClass}
            />
          </label>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
          <p className="text-xs font-semibold text-zinc-300 mb-2">
            {preview.length > 0
              ? `${preview.length} ${preview.length === 1 ? "bloque" : "bloques"} por día`
              : "Con estos valores no entra ningún bloque"}
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
            {preview.map((s) => (
              <span key={s.index} className="text-xs font-mono text-zinc-400 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5">
                {s.start}–{s.end}
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="glow" disabled={saving || !valid}>
            {saving ? "Guardando..." : "Guardar bloques"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
