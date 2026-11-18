import { isoDateInZone, zonedTimeToUtc } from "@/lib/dates";
import { completionKey, daysBetween, formatShortDate, occurrenceStartsInRange, weekdayKey } from "@/lib/recurrence";
import { ALL_DAY_REMINDER_TIME } from "@/lib/reminder-options";
import type { Calendar, PlannerEvent, WeekDay } from "@/lib/types";

// Lógica pura de los recordatorios de eventos (sin base de datos), para poder
// testearla. El cron la usa en lib/notifications/reminders.ts.

/** Ventana hacia adelante que se encola en cada corrida (> intervalo del cron). */
export const LOOKAHEAD_MS = 35 * 60_000;
/** Tolerancia hacia atrás: si el cron se atrasó un poco, igual se encola. */
export const GRACE_MS = 5 * 60_000;

export interface PlannedReminder {
  kind: string;
  scheduled_for: string;
  title: string;
  body: string;
}

/**
 * Minutos antes en que se avisa un evento.
 *  - Con hora: los del evento o, si no definió, los de su calendario.
 *  - Todo el día o sin hora: solo si el evento los pidió explícitamente
 *    (si no, cada tarea sin hora avisaría a las 9 de la mañana).
 */
export function effectiveReminders(event: PlannerEvent, calendar: Pick<Calendar, "defaultReminders"> | undefined): number[] {
  const timed = !event.allDay && Boolean(event.startTime);
  if (event.reminders) return event.reminders;
  return timed ? (calendar?.defaultReminders ?? []) : [];
}

const DAY_NAMES: Record<WeekDay, string> = {
  L: "lunes",
  M: "martes",
  X: "miércoles",
  J: "jueves",
  V: "viernes",
  S: "sábado",
  D: "domingo",
};

function whenLabel(occurrenceDate: string, reminderDate: string): string {
  const diff = daysBetween(reminderDate, occurrenceDate);
  if (diff === 0) return "hoy";
  if (diff === 1) return "mañana";
  return `el ${DAY_NAMES[weekdayKey(occurrenceDate)]} ${formatShortDate(occurrenceDate)}`;
}

function inLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} minutos`;
  if (minutes < 1440) {
    const h = Math.round(minutes / 60);
    return h === 1 ? "1 hora" : `${h} horas`;
  }
  const d = Math.round(minutes / 1440);
  return d === 1 ? "1 día" : `${d} días`;
}

export function planEventReminders(params: {
  event: PlannerEvent;
  offsets: number[];
  timeZone: string;
  now: Date;
  completed: ReadonlySet<string>;
}): PlannedReminder[] {
  const { event, offsets, timeZone, now, completed } = params;
  if (offsets.length === 0) return [];
  const timed = !event.allDay && Boolean(event.startTime);
  const anchorTime = timed ? event.startTime! : ALL_DAY_REMINDER_TIME;
  const maxOffsetMs = Math.max(...offsets) * 60_000;

  // Ocurrencias que pueden empezar dentro de [ahora - gracia, ahora + ventana + mayor anticipación].
  const from = isoDateInZone(new Date(now.getTime() - GRACE_MS - 86_400_000), timeZone);
  const to = isoDateInZone(new Date(now.getTime() + LOOKAHEAD_MS + maxOffsetMs + 86_400_000), timeZone);

  const out: PlannedReminder[] = [];
  for (const date of occurrenceStartsInRange({ ...event, endDate: undefined }, from, to)) {
    if (event.kind === "task" && completed.has(completionKey(event.id, date))) continue;
    const start = zonedTimeToUtc(date, anchorTime, timeZone);

    for (const offset of offsets) {
      const at = new Date(start.getTime() - offset * 60_000);
      const delta = at.getTime() - now.getTime();
      if (delta < -GRACE_MS || delta > LOOKAHEAD_MS) continue;

      const where = event.location ? ` · ${event.location}` : "";
      let body: string;
      if (timed && offset === 0) {
        body = `Empieza ahora (${event.startTime})${where}.`;
      } else if (timed && offset < 1440) {
        body = `Empieza en ${inLabel(offset)} (${event.startTime})${where}.`;
      } else {
        const when = whenLabel(date, isoDateInZone(at, timeZone));
        body = timed ? `Es ${when} a las ${event.startTime}${where}.` : `Es ${when}${where}.`;
      }

      out.push({ kind: `reminder_${offset}`, scheduled_for: at.toISOString(), title: event.title, body });
    }
  }
  return out;
}
