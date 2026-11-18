"use client";

import * as React from "react";
import { Bell, CalendarDays, Clock, Link2, MapPin, Palette, Repeat, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { COLOR_KEYS, PALETTE, normalizeColor, type ColorKey } from "@/lib/colors";
import { DAY_SHORT } from "@/lib/calendar-view";
import { WEEK_DAYS } from "@/lib/dates";
import { describeRecurrence, weekdayKey } from "@/lib/recurrence";
import { REMINDER_OPTIONS, reminderLabel } from "@/lib/reminder-options";
import { buildSlots, toMinutes, fromMinutes } from "@/lib/timetable";
import type { Calendar, EventKind, RecurrenceFreq, TaskPriority, WeekDay } from "@/lib/types";
import type { EventInput } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { CalendarBadge } from "./shared";

type RepeatFreq = "none" | RecurrenceFreq;
type Ends = "never" | "until" | "count";

interface Draft {
  calendarId: string;
  title: string;
  kind: EventKind;
  allDay: boolean;
  startDate: string;
  multiDay: boolean;
  endDate: string;
  startTime: string;
  endTime: string;
  freq: RepeatFreq;
  interval: number;
  byWeekday: WeekDay[];
  monthlyMode: "day" | "nth";
  ends: Ends;
  until: string;
  count: number;
  useCalendarReminders: boolean;
  reminders: number[];
  location: string;
  url: string;
  description: string;
  color: ColorKey | null;
  priority: TaskPriority;
  tag: string;
}

function toDraft(input: EventInput, calendars: Calendar[]): Draft {
  const rule = input.recurrence ?? undefined;
  return {
    calendarId: input.calendarId ?? calendars.find((c) => !c.hidden)?.id ?? calendars[0]?.id ?? "",
    title: input.title,
    kind: input.kind,
    allDay: input.allDay,
    startDate: input.startDate,
    multiDay: Boolean(input.endDate && input.endDate > input.startDate),
    endDate: input.endDate ?? input.startDate,
    startTime: input.startTime ?? "09:00",
    endTime: input.endTime ?? "10:00",
    freq: rule?.freq ?? "none",
    interval: rule?.interval ?? 1,
    byWeekday: rule?.byWeekday?.length ? rule.byWeekday : [weekdayKey(input.startDate)],
    monthlyMode: rule?.monthlyMode ?? "day",
    ends: rule?.until ? "until" : rule?.count ? "count" : "never",
    until: rule?.until ?? "",
    count: rule?.count ?? 10,
    useCalendarReminders: input.reminders == null,
    reminders: input.reminders ?? [],
    location: input.location ?? "",
    url: input.url ?? "",
    description: input.description ?? "",
    color: input.color ? normalizeColor(input.color) : null,
    priority: input.priority,
    tag: input.tag ?? "",
  };
}

function toInput(d: Draft): EventInput {
  const timed = !d.allDay;
  return {
    calendarId: d.calendarId || undefined,
    title: d.title.trim(),
    description: d.description.trim() || undefined,
    kind: d.kind,
    allDay: d.allDay,
    startDate: d.startDate,
    endDate: d.multiDay && d.endDate > d.startDate ? d.endDate : undefined,
    startTime: timed ? d.startTime : undefined,
    endTime: timed && d.endTime ? d.endTime : undefined,
    recurrence:
      d.freq === "none"
        ? null
        : {
            freq: d.freq,
            interval: Math.max(1, Math.floor(d.interval) || 1),
            ...(d.freq === "weekly" && { byWeekday: d.byWeekday.length ? d.byWeekday : [weekdayKey(d.startDate)] }),
            ...(d.freq === "monthly" && { monthlyMode: d.monthlyMode }),
            ...(d.ends === "until" && d.until && { until: d.until }),
            ...(d.ends === "count" && { count: Math.max(1, Math.floor(d.count) || 1) }),
          },
    reminders: d.useCalendarReminders ? null : d.reminders,
    location: d.location.trim() || undefined,
    url: d.url.trim() || undefined,
    color: d.color,
    priority: d.priority,
    tag: d.tag.trim() || undefined,
  };
}

const FREQ_LABELS: Record<RepeatFreq, string> = {
  none: "No se repite",
  daily: "Diaria",
  weekly: "Semanal",
  monthly: "Mensual",
  yearly: "Anual",
};
const UNIT_LABELS: Record<RecurrenceFreq, [string, string]> = {
  daily: ["día", "días"],
  weekly: ["semana", "semanas"],
  monthly: ["mes", "meses"],
  yearly: ["año", "años"],
};

const field =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none";
const label = "block text-xs font-medium text-zinc-400 mb-1";

function Chip({ active, onClick, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors cursor-pointer",
        active ? "bg-violet-600 border-violet-500 text-white" : "border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600"
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

interface EventEditorProps {
  initial: EventInput;
  isNew: boolean;
  calendars: Calendar[];
  onClose: () => void;
  onSave: (input: EventInput) => Promise<boolean>;
  onDelete?: () => Promise<boolean>;
}

export function EventEditor({ initial, isNew, calendars, onClose, onSave, onDelete }: EventEditorProps) {
  const [d, setD] = React.useState(() => toDraft(initial, calendars));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setD((prev) => ({ ...prev, [key]: value }));

  const calendar = calendars.find((c) => c.id === d.calendarId);
  const slots = calendar?.useSlots ? buildSlots(calendar.schedule) : [];
  const preview = toInput(d);

  const setStartTime = (value: string) =>
    setD((prev) => {
      // Mantiene la duración al mover el inicio.
      const duration = toMinutes(prev.endTime) - toMinutes(prev.startTime);
      const end = duration > 0 ? fromMinutes(toMinutes(value) + duration) : prev.endTime;
      return { ...prev, startTime: value, endTime: prev.multiDay ? prev.endTime : end };
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!d.title.trim()) return setError("Escribí un título.");
    if (d.multiDay && d.endDate < d.startDate) return setError("La fecha de fin no puede ser antes del inicio.");
    if (!d.allDay && !d.multiDay && d.endTime && toMinutes(d.endTime) <= toMinutes(d.startTime))
      return setError("La hora de fin tiene que ser después de la de inicio.");
    if (d.freq !== "none" && d.ends === "until" && (!d.until || d.until < d.startDate))
      return setError("Elegí hasta qué fecha se repite (después del inicio).");
    if (d.freq === "weekly" && d.byWeekday.length === 0) return setError("Elegí al menos un día de la semana.");
    setError(null);
    setSaving(true);
    const ok = await onSave(toInput(d));
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={isNew ? "Nuevo" : d.kind === "task" ? "Editar tarea" : "Editar evento"}
      className="max-w-2xl max-h-[92vh] overflow-y-auto"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Tipo + título */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <Chip active={d.kind === "event"} onClick={() => set("kind", "event")}>
              Evento
            </Chip>
            <Chip active={d.kind === "task"} onClick={() => set("kind", "task")}>
              Tarea (se tilda)
            </Chip>
          </div>
          <input
            autoFocus
            value={d.title}
            onChange={(e) => set("title", e.target.value)}
            maxLength={200}
            placeholder={d.kind === "task" ? "Ej: Entregar el TP de Redes" : "Ej: Final de Física III"}
            aria-label="Título"
            className={cn(field, "text-base py-2.5")}
          />
        </div>

        {/* Calendario */}
        <div>
          <span className={label}>Calendario</span>
          <div className="flex flex-wrap gap-1.5">
            {calendars.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => set("calendarId", c.id)}
                aria-pressed={d.calendarId === c.id}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer",
                  d.calendarId === c.id ? "border-white text-white bg-zinc-800" : "border-zinc-800 text-zinc-400 hover:text-white"
                )}
              >
                <CalendarBadge calendar={c} />
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Fecha y hora */}
        <fieldset className="rounded-xl border border-zinc-800 p-3 space-y-3">
          <legend className="px-1 text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-violet-400" /> Cuándo
          </legend>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input type="checkbox" checked={d.allDay} onChange={(e) => set("allDay", e.target.checked)} className="h-4 w-4 accent-violet-500" />
              {d.kind === "task" ? "Sin hora" : "Todo el día"}
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={d.multiDay}
                onChange={(e) =>
                  setD((prev) => ({
                    ...prev,
                    multiDay: e.target.checked,
                    endDate: prev.endDate > prev.startDate ? prev.endDate : prev.startDate,
                  }))
                }
                className="h-4 w-4 accent-violet-500"
              />
              Dura varios días
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <label className="col-span-2 sm:col-span-1">
              <span className={label}>{d.multiDay ? "Desde" : "Fecha"}</span>
              <input
                type="date"
                value={d.startDate}
                onChange={(e) =>
                  e.target.value &&
                  setD((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                    endDate: prev.endDate < e.target.value ? e.target.value : prev.endDate,
                  }))
                }
                className={field}
              />
            </label>
            {!d.allDay && (
              <label>
                <span className={label}>Empieza</span>
                <input type="time" value={d.startTime} onChange={(e) => e.target.value && setStartTime(e.target.value)} className={field} />
              </label>
            )}
            {d.multiDay && (
              <label className="col-span-2 sm:col-span-1">
                <span className={label}>Hasta</span>
                <input
                  type="date"
                  value={d.endDate}
                  min={d.startDate}
                  onChange={(e) => e.target.value && set("endDate", e.target.value)}
                  className={field}
                />
              </label>
            )}
            {!d.allDay && (
              <label>
                <span className={label}>Termina</span>
                <input type="time" value={d.endTime} onChange={(e) => set("endTime", e.target.value)} className={field} />
              </label>
            )}
          </div>

          {!d.allDay && slots.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <Clock className="h-3.5 w-3.5 text-violet-400" />
              Bloques de {calendar?.name}:
              <select
                aria-label="Desde el bloque"
                value={slots.find((s) => s.start === d.startTime)?.start ?? ""}
                onChange={(e) => {
                  const slot = slots.find((s) => s.start === e.target.value);
                  if (slot)
                    setD((prev) => ({
                      ...prev,
                      startTime: slot.start,
                      endTime: toMinutes(prev.endTime) > toMinutes(slot.start) ? prev.endTime : slot.end,
                    }));
                }}
                className="bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-zinc-200"
              >
                <option value="">desde…</option>
                {slots.map((s) => (
                  <option key={s.index} value={s.start}>
                    {s.start}
                  </option>
                ))}
              </select>
              <select
                aria-label="Hasta el bloque"
                value={slots.find((s) => s.end === d.endTime)?.end ?? ""}
                onChange={(e) => e.target.value && set("endTime", e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-zinc-200"
              >
                <option value="">hasta…</option>
                {slots
                  .filter((s) => toMinutes(s.end) > toMinutes(d.startTime))
                  .map((s) => (
                    <option key={s.index} value={s.end}>
                      {s.end}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </fieldset>

        {/* Repetición */}
        <fieldset className="rounded-xl border border-zinc-800 p-3 space-y-3">
          <legend className="px-1 text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Repeat className="h-3.5 w-3.5 text-violet-400" /> Repetición
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(FREQ_LABELS) as RepeatFreq[]).map((f) => (
              <Chip key={f} active={d.freq === f} onClick={() => set("freq", f)}>
                {FREQ_LABELS[f]}
              </Chip>
            ))}
          </div>

          {d.freq !== "none" && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                Cada
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={d.interval}
                  onChange={(e) => set("interval", Number(e.target.value))}
                  className="w-16 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
                />
                {UNIT_LABELS[d.freq][d.interval === 1 ? 0 : 1]}
              </label>

              {d.freq === "weekly" && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {WEEK_DAYS.map((day) => (
                    <Chip
                      key={day}
                      active={d.byWeekday.includes(day)}
                      onClick={() =>
                        set("byWeekday", d.byWeekday.includes(day) ? d.byWeekday.filter((x) => x !== day) : [...d.byWeekday, day])
                      }
                    >
                      {DAY_SHORT[day]}
                    </Chip>
                  ))}
                  <button
                    type="button"
                    onClick={() => set("byWeekday", ["L", "M", "X", "J", "V"])}
                    className="text-xs text-violet-300 hover:text-violet-200 ml-1 cursor-pointer"
                  >
                    Lunes a viernes
                  </button>
                </div>
              )}

              {d.freq === "monthly" && (
                <div className="flex flex-wrap gap-1.5">
                  <Chip active={d.monthlyMode === "day"} onClick={() => set("monthlyMode", "day")}>
                    El día {Number(d.startDate.slice(8, 10))}
                  </Chip>
                  <Chip active={d.monthlyMode === "nth"} onClick={() => set("monthlyMode", "nth")}>
                    {describeRecurrence({ freq: "monthly", interval: 1, monthlyMode: "nth" }, d.startDate).replace("Todos los meses ", "")}
                  </Chip>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-300">
                <span className="text-xs text-zinc-400">Termina:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="ends" checked={d.ends === "never"} onChange={() => set("ends", "never")} className="accent-violet-500" />
                  Nunca
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="ends" checked={d.ends === "until"} onChange={() => set("ends", "until")} className="accent-violet-500" />
                  El
                  <input
                    type="date"
                    value={d.until}
                    min={d.startDate}
                    onChange={(e) => setD((prev) => ({ ...prev, until: e.target.value, ends: "until" }))}
                    className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
                  />
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="ends" checked={d.ends === "count"} onChange={() => set("ends", "count")} className="accent-violet-500" />
                  Después de
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={d.count}
                    onChange={(e) => setD((prev) => ({ ...prev, count: Number(e.target.value), ends: "count" }))}
                    className="w-16 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
                  />
                  veces
                </label>
              </div>

              <p className="text-xs text-violet-200/90">{describeRecurrence(preview.recurrence ?? undefined, d.startDate)}</p>
            </div>
          )}
        </fieldset>

        {/* Recordatorios */}
        <fieldset className="rounded-xl border border-zinc-800 p-3 space-y-2">
          <legend className="px-1 text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5 text-violet-400" /> Recordatorios
          </legend>
          <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={d.useCalendarReminders}
              onChange={(e) => set("useCalendarReminders", e.target.checked)}
              className="h-4 w-4 accent-violet-500"
            />
            Usar los del calendario
            <span className="text-xs text-zinc-500">
              (
              {d.allDay
                ? "sin hora no avisa"
                : calendar?.defaultReminders.length
                  ? calendar.defaultReminders.map(reminderLabel).join(", ")
                  : "ninguno"}
              )
            </span>
          </label>
          {!d.useCalendarReminders && (
            <div className="flex flex-wrap gap-1.5">
              {REMINDER_OPTIONS.map((m) => (
                <Chip
                  key={m}
                  active={d.reminders.includes(m)}
                  onClick={() => set("reminders", d.reminders.includes(m) ? d.reminders.filter((x) => x !== m) : [...d.reminders, m].slice(-6))}
                >
                  {d.allDay && m < 1440 ? (m === 0 ? "El día, 9:00" : `${reminderLabel(m)} de las 9:00`) : reminderLabel(m)}
                </Chip>
              ))}
              {d.reminders.length === 0 && <span className="text-xs text-zinc-500 self-center">Sin avisos</span>}
            </div>
          )}
        </fieldset>

        {/* Detalles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label>
            <span className={cn(label, "flex items-center gap-1")}>
              <MapPin className="h-3 w-3" /> Lugar / aula
            </span>
            <input value={d.location} onChange={(e) => set("location", e.target.value)} maxLength={200} placeholder="Ej: Aula 204" className={field} />
          </label>
          <label>
            <span className={cn(label, "flex items-center gap-1")}>
              <Link2 className="h-3 w-3" /> Link
            </span>
            <input
              value={d.url}
              onChange={(e) => set("url", e.target.value)}
              maxLength={500}
              placeholder="Ej: link de Meet o del aula virtual"
              className={field}
            />
          </label>
          <label>
            <span className={label}>Etiqueta</span>
            <input
              value={d.tag}
              onChange={(e) => set("tag", e.target.value)}
              list="event-tags"
              maxLength={40}
              placeholder="Curso, Com A, Parcial, Final…"
              className={field}
            />
            <datalist id="event-tags">
              {["Curso", "Com A", "Com B", "Teoría", "Práctica", "Laboratorio", "Parcial", "Final", "Entrega", "Reunión"].map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>
          {d.kind === "task" && (
            <label>
              <span className={label}>Prioridad</span>
              <select value={d.priority} onChange={(e) => set("priority", e.target.value as TaskPriority)} className={field}>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </label>
          )}
          <label className="sm:col-span-2">
            <span className={label}>Notas</span>
            <textarea
              value={d.description}
              onChange={(e) => set("description", e.target.value)}
              maxLength={2000}
              rows={2}
              placeholder="Temas, qué llevar, lo que necesites recordar"
              className={cn(field, "resize-none")}
            />
          </label>
        </div>

        <div>
          <span className={cn(label, "flex items-center gap-1")}>
            <Palette className="h-3 w-3" /> Color
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Chip active={d.color === null} onClick={() => set("color", null)}>
              Del calendario
            </Chip>
            {COLOR_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => set("color", key)}
                aria-label={PALETTE[key].label}
                aria-pressed={d.color === key}
                title={PALETTE[key].label}
                className={cn(
                  "h-6 w-6 rounded-full border-2 cursor-pointer transition-transform",
                  PALETTE[key].dot,
                  d.color === key ? "border-white scale-110" : "border-transparent hover:scale-105"
                )}
              />
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <div className="flex items-center justify-between gap-2 pt-4 border-t border-zinc-800">
          {onDelete ? (
            confirmDelete ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-rose-300">{d.freq !== "none" ? "¿Borrar todas las repeticiones?" : "¿Borrar?"}</span>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    const ok = await onDelete();
                    setSaving(false);
                    if (ok) onClose();
                  }}
                  className="text-rose-400 hover:text-rose-300"
                >
                  Sí, borrar
                </Button>
                <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>
                  No
                </Button>
              </div>
            ) : (
              <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)} className="gap-1.5 text-rose-400 hover:text-rose-300">
                <Trash2 className="h-4 w-4" /> Eliminar
              </Button>
            )
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
