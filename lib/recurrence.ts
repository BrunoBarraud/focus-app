import { WEEK_DAYS } from "./dates";
import type { PlannerEvent, PlannerOccurrence, Recurrence, WeekDay } from "./types";

// Motor de repeticiones del calendario. Todo es aritmética de fechas
// "YYYY-MM-DD" en UTC (sin horas), así no hay saltos por horario de verano.

const DAY_MS = 86_400_000;

function toUtc(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function shiftDays(iso: string, days: number): string {
  return fromUtc(toUtc(iso) + days * DAY_MS);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

/** 0 = lunes … 6 = domingo. */
function weekdayIndex(iso: string): number {
  return (new Date(toUtc(iso)).getUTCDay() + 6) % 7;
}

export function weekdayKey(iso: string): WeekDay {
  return WEEK_DAYS[weekdayIndex(iso)];
}

function daysInMonthUtc(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

function makeDate(year: number, month0: number, day: number): string {
  return fromUtc(Date.UTC(year, month0, day));
}

/** "El n-ésimo <día de semana> del mes" de una fecha: n = 1..4, o -1 si es el último. */
export function nthWeekdayOf(iso: string): { weekday: number; nth: number } {
  const nth = Math.ceil(Number(iso.slice(8, 10)) / 7);
  // El quinto (que no todos los meses tienen) se toma como "el último".
  return { weekday: weekdayIndex(iso), nth: nth === 5 ? -1 : nth };
}

function nthWeekdayInMonth(year: number, month0: number, weekday: number, nth: number): string | null {
  if (nth === -1) {
    const last = daysInMonthUtc(year, month0);
    const lastWeekday = weekdayIndex(makeDate(year, month0, last));
    return makeDate(year, month0, last - ((lastWeekday - weekday + 7) % 7));
  }
  const firstWeekday = weekdayIndex(makeDate(year, month0, 1));
  const day = 1 + ((weekday - firstWeekday + 7) % 7) + (nth - 1) * 7;
  return day <= daysInMonthUtc(year, month0) ? makeDate(year, month0, day) : null;
}

/** Tope de seguridad: ninguna regla genera más que esto por consulta. */
const MAX_ITERATIONS = 20_000;

/**
 * Fechas de inicio de cada repetición, en orden, desde `startDate` hasta
 * `limit` (inclusive). Respeta interval, until y count.
 */
export function recurrenceStarts(startDate: string, rule: Recurrence | undefined, limit: string): string[] {
  if (!rule) return startDate <= limit ? [startDate] : [];

  const interval = Math.max(1, Math.floor(rule.interval || 1));
  const end = rule.until && rule.until < limit ? rule.until : limit;
  const count = rule.count && rule.count > 0 ? rule.count : Infinity;
  const out: string[] = [];
  const push = (d: string) => {
    if (d < startDate || d > end || out.length >= count) return false;
    out.push(d);
    return true;
  };
  const done = () => out.length >= count;

  const [sy, sm, sd] = startDate.split("-").map(Number);
  let guard = 0;

  switch (rule.freq) {
    case "daily": {
      for (let d = startDate; d <= end && !done() && guard++ < MAX_ITERATIONS; d = shiftDays(d, interval)) push(d);
      break;
    }
    case "weekly": {
      const days = new Set((rule.byWeekday?.length ? rule.byWeekday : [weekdayKey(startDate)]).map((k) => WEEK_DAYS.indexOf(k)));
      // Semanas contadas desde el lunes de la semana de inicio.
      let monday = shiftDays(startDate, -weekdayIndex(startDate));
      while (monday <= end && !done() && guard++ < MAX_ITERATIONS) {
        for (let i = 0; i < 7 && !done(); i++) {
          if (days.has(i)) push(shiftDays(monday, i));
        }
        monday = shiftDays(monday, 7 * interval);
      }
      break;
    }
    case "monthly": {
      const { weekday, nth } = nthWeekdayOf(startDate);
      for (let k = 0; !done() && guard++ < MAX_ITERATIONS; k += interval) {
        const year = sy + Math.floor((sm - 1 + k) / 12);
        const month0 = (sm - 1 + k) % 12;
        if (makeDate(year, month0, 1) > end) break;
        const date =
          rule.monthlyMode === "nth"
            ? nthWeekdayInMonth(year, month0, weekday, nth)
            : sd <= daysInMonthUtc(year, month0)
              ? makeDate(year, month0, sd)
              : null; // ese mes no tiene ese día (31, 30…): se saltea
        if (date) push(date);
      }
      break;
    }
    case "yearly": {
      for (let k = 0; !done() && guard++ < MAX_ITERATIONS; k += interval) {
        const year = sy + k;
        if (makeDate(year, 0, 1) > end) break;
        // 29 de febrero: solo en años bisiestos.
        if (sd <= daysInMonthUtc(year, sm - 1)) push(makeDate(year, sm - 1, sd));
      }
      break;
    }
  }
  return out;
}

/** Duración en días de cada ocurrencia (0 = termina el mismo día). */
export function spanDays(event: Pick<PlannerEvent, "startDate" | "endDate">): number {
  return event.endDate && event.endDate > event.startDate ? daysBetween(event.startDate, event.endDate) : 0;
}

/** Fechas de inicio de las ocurrencias que tocan el rango [from, to]. */
export function occurrenceStartsInRange(
  event: Pick<PlannerEvent, "startDate" | "endDate" | "recurrence">,
  from: string,
  to: string
): string[] {
  const span = spanDays(event);
  // Una ocurrencia de varios días que empezó antes de `from` puede seguir activa.
  const earliest = shiftDays(from, -span);
  return recurrenceStarts(event.startDate, event.recurrence, to).filter((d) => d >= earliest);
}

export function completionKey(eventId: string, isoDate: string): string {
  return `${eventId}|${isoDate}`;
}

function compareOccurrences(a: PlannerOccurrence, b: PlannerOccurrence): number {
  if (a.occurrenceDate !== b.occurrenceDate) return a.occurrenceDate.localeCompare(b.occurrenceDate);
  // Todo el día y sin hora primero, después por hora.
  const aTimed = !a.allDay && a.startTime;
  const bTimed = !b.allDay && b.startTime;
  if (!aTimed && bTimed) return -1;
  if (aTimed && !bTimed) return 1;
  if (aTimed && bTimed && a.startTime !== b.startTime) return a.startTime!.localeCompare(b.startTime!);
  return a.title.localeCompare(b.title);
}

/** Todas las ocurrencias que tocan [from, to], ordenadas. */
export function occurrencesInRange(
  events: PlannerEvent[],
  completions: ReadonlySet<string>,
  from: string,
  to: string
): PlannerOccurrence[] {
  const out: PlannerOccurrence[] = [];
  for (const event of events) {
    const span = spanDays(event);
    for (const date of occurrenceStartsInRange(event, from, to)) {
      out.push({
        ...event,
        occurrenceDate: date,
        occurrenceEndDate: shiftDays(date, span),
        completed: completions.has(completionKey(event.id, date)),
      });
    }
  }
  return out.sort(compareOccurrences);
}

/** Ocurrencias activas en un día (incluye las de varios días que lo cruzan). */
export function occurrencesOn(events: PlannerEvent[], completions: ReadonlySet<string>, date: string): PlannerOccurrence[] {
  return occurrencesInRange(events, completions, date, date);
}

// ------------------------------------------------------------------------------
// Textos
// ------------------------------------------------------------------------------

const DAY_NAMES_LONG: Record<WeekDay, string> = {
  L: "lunes",
  M: "martes",
  X: "miércoles",
  J: "jueves",
  V: "viernes",
  S: "sábado",
  D: "domingo",
};
const NTH_NAMES: Record<number, string> = { 1: "primer", 2: "segundo", 3: "tercer", 4: "cuarto", [-1]: "último" };
const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

export function formatShortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} de ${MONTHS[m - 1]}`;
}

/** "Cada semana los martes y jueves, hasta el 28 de noviembre". */
export function describeRecurrence(rule: Recurrence | undefined, startDate: string): string {
  if (!rule) return "No se repite";
  const n = Math.max(1, rule.interval || 1);
  let text: string;
  switch (rule.freq) {
    case "daily":
      text = n === 1 ? "Todos los días" : `Cada ${n} días`;
      break;
    case "weekly": {
      const days = (rule.byWeekday?.length ? rule.byWeekday : [weekdayKey(startDate)])
        .slice()
        .sort((a, b) => WEEK_DAYS.indexOf(a) - WEEK_DAYS.indexOf(b));
      const everyDay = days.length === 7;
      const weekdays = days.length === 5 && !days.includes("S") && !days.includes("D");
      const which = everyDay
        ? "todos los días"
        : weekdays
          ? "de lunes a viernes"
          : `los ${listJoin(days.map((d) => (d === "S" || d === "D" ? `${DAY_NAMES_LONG[d]}s` : DAY_NAMES_LONG[d])))}`;
      text = `${n === 1 ? "Cada semana" : `Cada ${n} semanas`} ${which}`;
      break;
    }
    case "monthly": {
      const every = n === 1 ? "Todos los meses" : `Cada ${n} meses`;
      if (rule.monthlyMode === "nth") {
        const { weekday, nth } = nthWeekdayOf(startDate);
        text = `${every} el ${NTH_NAMES[nth]} ${DAY_NAMES_LONG[WEEK_DAYS[weekday]]}`;
      } else {
        text = `${every} el día ${Number(startDate.slice(8, 10))}`;
      }
      break;
    }
    case "yearly":
      text = `${n === 1 ? "Todos los años" : `Cada ${n} años`} el ${formatShortDate(startDate)}`;
      break;
  }
  if (rule.until) text += `, hasta el ${formatShortDate(rule.until)}`;
  else if (rule.count) text += `, ${rule.count} ${rule.count === 1 ? "vez" : "veces"}`;
  return text;
}
