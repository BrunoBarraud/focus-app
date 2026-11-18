import { WEEK_DAYS } from "./dates";
import { shiftDays, weekdayKey } from "./recurrence";
import type { WeekDay } from "./types";

// Rangos, navegación y títulos de las vistas del calendario (lógica pura).

export type CalendarView = "day" | "week" | "month" | "agenda";
export const AGENDA_DAYS = 60;

export const MONTHS = [
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
export const DAY_NAMES: Record<WeekDay, string> = {
  L: "lunes",
  M: "martes",
  X: "miércoles",
  J: "jueves",
  V: "viernes",
  S: "sábado",
  D: "domingo",
};
export const DAY_SHORT: Record<WeekDay, string> = { L: "lun", M: "mar", X: "mié", J: "jue", V: "vie", S: "sáb", D: "dom" };

function parts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function lastDayOfMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

/** Suma meses manteniendo el día (31/01 + 1 mes = 28/02). */
export function addMonths(iso: string, months: number): string {
  const { y, m, d } = parts(iso);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${pad(nm)}-${pad(Math.min(d, lastDayOfMonth(ny, nm)))}`;
}

export function startOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function mondayOf(iso: string): string {
  return shiftDays(iso, -WEEK_DAYS.indexOf(weekdayKey(iso)));
}

/** Rango de fechas que muestra cada vista. */
export function rangeFor(view: CalendarView, anchor: string): { from: string; to: string } {
  switch (view) {
    case "day":
      return { from: anchor, to: anchor };
    case "week": {
      const from = mondayOf(anchor);
      return { from, to: shiftDays(from, 6) };
    }
    case "month": {
      // Grilla de 6 semanas que arranca el lunes anterior al día 1.
      const from = mondayOf(startOfMonth(anchor));
      return { from, to: shiftDays(from, 41) };
    }
    case "agenda":
      return { from: anchor, to: shiftDays(anchor, AGENDA_DAYS - 1) };
  }
}

export function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = shiftDays(d, 1)) out.push(d);
  return out;
}

/** Fecha a la que se mueve con ← / →. */
export function stepAnchor(view: CalendarView, anchor: string, direction: 1 | -1): string {
  switch (view) {
    case "day":
      return shiftDays(anchor, direction);
    case "week":
      return shiftDays(anchor, 7 * direction);
    case "month":
      return addMonths(anchor, direction);
    case "agenda":
      return shiftDays(anchor, 30 * direction);
  }
}

export function longDate(iso: string, withYear = false): string {
  const { y, m, d } = parts(iso);
  return `${DAY_NAMES[weekdayKey(iso)]} ${d} de ${MONTHS[m - 1]}${withYear ? ` de ${y}` : ""}`;
}

/** Título de la barra: "noviembre de 2026", "16 – 22 de noviembre de 2026"… */
export function titleFor(view: CalendarView, anchor: string): string {
  const { y, m } = parts(anchor);
  switch (view) {
    case "day":
      return longDate(anchor, true);
    case "month":
      return `${MONTHS[m - 1]} de ${y}`;
    case "week": {
      const { from, to } = rangeFor("week", anchor);
      const a = parts(from);
      const b = parts(to);
      if (a.m === b.m) return `${a.d} – ${b.d} de ${MONTHS[b.m - 1]} de ${b.y}`;
      if (a.y === b.y) return `${a.d} de ${MONTHS[a.m - 1]} – ${b.d} de ${MONTHS[b.m - 1]} de ${b.y}`;
      return `${a.d} de ${MONTHS[a.m - 1]} de ${a.y} – ${b.d} de ${MONTHS[b.m - 1]} de ${b.y}`;
    }
    case "agenda":
      return `Desde el ${longDate(anchor)}`;
  }
}
