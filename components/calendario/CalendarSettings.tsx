"use client";

import * as React from "react";
import { Bell, LayoutGrid, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CALENDAR_COLOR_ORDER, COLOR_KEYS, PALETTE, normalizeColor, type ColorKey } from "@/lib/colors";
import { REMINDER_OPTIONS, reminderLabel } from "@/lib/reminder-options";
import { buildSlots, DEFAULT_SCHEDULE } from "@/lib/timetable";
import type { Calendar, CalendarSchedule } from "@/lib/types";
import type { CalendarInput } from "@/lib/validation";
import { cn } from "@/lib/utils";

const ICONS = ["📚", "🎓", "💼", "🏋️", "🏠", "🎂", "✈️", "🩺", "🎮", "🎵", "⚽", "❤️"];

const field =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none";
const label = "block text-xs font-medium text-zinc-400 mb-1";

interface CalendarSettingsProps {
  /** undefined = calendario nuevo. */
  calendar?: Calendar;
  calendarCount: number;
  eventCount: number;
  onClose: () => void;
  onSave: (input: CalendarInput) => Promise<boolean>;
  onDelete?: () => Promise<boolean>;
}

export function CalendarSettings({ calendar, calendarCount, eventCount, onClose, onSave, onDelete }: CalendarSettingsProps) {
  const [name, setName] = React.useState(calendar?.name ?? "");
  const [icon, setIcon] = React.useState(calendar?.icon ?? "");
  const [color, setColor] = React.useState<ColorKey>(
    normalizeColor(calendar?.color, CALENDAR_COLOR_ORDER[calendarCount % CALENDAR_COLOR_ORDER.length])
  );
  const [reminders, setReminders] = React.useState<number[]>(calendar?.defaultReminders ?? [15]);
  const [useSlots, setUseSlots] = React.useState(calendar?.useSlots ?? false);
  const [schedule, setSchedule] = React.useState<CalendarSchedule>(calendar?.schedule ?? DEFAULT_SCHEDULE);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const preview = buildSlots(schedule);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Poné un nombre.");
    if (useSlots && preview.length === 0) return setError("Con esa configuración de bloques no entra ninguno.");
    setError(null);
    setSaving(true);
    const ok = await onSave({
      name: name.trim(),
      color,
      icon: icon.trim() || null,
      defaultReminders: reminders,
      useSlots,
      ...(useSlots && { schedule }),
    });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={calendar ? `Ajustes de ${calendar.name}` : "Nuevo calendario"}
      description="Cada calendario agrupa lo tuyo: facultad, trabajo, gimnasio, cumpleaños…"
      className="max-w-xl max-h-[92vh] overflow-y-auto"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <label>
            <span className={label}>Nombre</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="Ej: Facultad"
              className={field}
            />
          </label>
          <label>
            <span className={label}>Ícono</span>
            <input
              value={icon}
              onChange={(e) => setIcon([...e.target.value].slice(-2).join(""))}
              placeholder="—"
              aria-label="Emoji del calendario"
              className={cn(field, "w-16 text-center text-lg")}
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-1">
          {ICONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setIcon(icon === emoji ? "" : emoji)}
              aria-pressed={icon === emoji}
              className={cn("h-8 w-8 rounded-lg text-lg cursor-pointer hover:bg-zinc-800", icon === emoji && "bg-zinc-800 ring-1 ring-violet-500")}
            >
              {emoji}
            </button>
          ))}
        </div>

        <div>
          <span className={label}>Color</span>
          <div className="flex flex-wrap gap-2">
            {COLOR_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setColor(key)}
                aria-label={PALETTE[key].label}
                aria-pressed={color === key}
                title={PALETTE[key].label}
                className={cn(
                  "h-7 w-7 rounded-full border-2 cursor-pointer transition-transform",
                  PALETTE[key].dot,
                  color === key ? "border-white scale-110" : "border-transparent hover:scale-105"
                )}
              />
            ))}
          </div>
        </div>

        <fieldset className="rounded-xl border border-zinc-800 p-3 space-y-2">
          <legend className="px-1 text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5 text-violet-400" /> Recordatorios por defecto
          </legend>
          <p className="text-xs text-zinc-500">Para los eventos con hora de este calendario que no definan los suyos.</p>
          <div className="flex flex-wrap gap-1.5">
            {REMINDER_OPTIONS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setReminders((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].slice(-6)))}
                aria-pressed={reminders.includes(m)}
                className={cn(
                  "px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer",
                  reminders.includes(m) ? "bg-violet-600 border-violet-500 text-white" : "border-zinc-800 text-zinc-400 hover:text-white"
                )}
              >
                {reminderLabel(m)}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-zinc-800 p-3 space-y-3">
          <legend className="px-1 text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5 text-violet-400" /> Grilla por bloques
          </legend>
          <label className="flex items-start gap-2 text-sm text-zinc-300 cursor-pointer">
            <input type="checkbox" checked={useSlots} onChange={(e) => setUseSlots(e.target.checked)} className="h-4 w-4 mt-0.5 accent-violet-500" />
            <span>
              Usar bloques horarios en las vistas Día y Semana
              <span className="block text-xs text-zinc-500">Como la grilla de la facultad: módulos que no arrancan en punto.</span>
            </span>
          </label>

          {useSlots && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className={label}>Primer bloque</span>
                  <input type="time" value={schedule.start} onChange={(e) => setSchedule((s) => ({ ...s, start: e.target.value }))} className={field} />
                </label>
                <label>
                  <span className={label}>El día termina</span>
                  <input type="time" value={schedule.end} onChange={(e) => setSchedule((s) => ({ ...s, end: e.target.value }))} className={field} />
                </label>
                <label>
                  <span className={label}>Duración de cada bloque (min)</span>
                  <input
                    type="number"
                    min={10}
                    max={240}
                    value={schedule.slotMinutes}
                    onChange={(e) => setSchedule((s) => ({ ...s, slotMinutes: Number(e.target.value) }))}
                    className={field}
                  />
                </label>
                <label>
                  <span className={label}>Corte entre bloques (min)</span>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={schedule.gapMinutes}
                    onChange={(e) => setSchedule((s) => ({ ...s, gapMinutes: Number(e.target.value) }))}
                    className={field}
                  />
                </label>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5">
                <p className="text-xs font-semibold text-zinc-300 mb-1.5">
                  {preview.length > 0 ? `${preview.length} ${preview.length === 1 ? "bloque" : "bloques"} por día` : "No entra ningún bloque"}
                </p>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {preview.map((s) => (
                    <span key={s.index} className="text-[11px] font-mono text-zinc-400 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5">
                      {s.start}–{s.end}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </fieldset>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <div className="flex items-center justify-between gap-2 pt-4 border-t border-zinc-800">
          {onDelete && calendarCount > 1 ? (
            confirmDelete ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-rose-300">
                  Se borra{eventCount === 1 ? " 1 evento" : eventCount > 1 ? `n ${eventCount} eventos` : " el calendario"}. No se puede deshacer.
                </span>
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
                  Borrar
                </Button>
                <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)} className="gap-1.5 text-rose-400 hover:text-rose-300">
                <Trash2 className="h-4 w-4" /> Eliminar calendario
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
              {saving ? "Guardando..." : calendar ? "Guardar" : "Crear"}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
