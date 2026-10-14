import type { WeekDay } from "./types";

// Todas las fechas de calendario se manejan como strings "YYYY-MM-DD" en la
// zona horaria LOCAL del usuario. Nunca usar toISOString() para obtener "hoy":
// devuelve la fecha en UTC y a la noche ya es "mañana".

export const WEEK_DAYS: WeekDay[] = ["L", "M", "X", "J", "V", "S", "D"];
const JS_DAY_TO_KEY: WeekDay[] = ["D", "L", "M", "X", "J", "V", "S"];

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE_RE.test(value)) return false;
  const d = parseIsoDate(value);
  return toIsoDate(d) === value;
}

export function isTime(value: unknown): value is string {
  return typeof value === "string" && TIME_RE.test(value);
}

/** Fecha local de un Date como "YYYY-MM-DD". */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

/** Parsea "YYYY-MM-DD" como mediodía local (evita saltos de día por DST/UTC). */
export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function addDays(iso: string, days: number): string {
  const d = parseIsoDate(iso);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

export function weekDayOf(iso: string): WeekDay {
  return JS_DAY_TO_KEY[parseIsoDate(iso).getDay()];
}

/** Lunes de la semana que contiene `iso`. */
export function startOfWeek(iso: string): string {
  const jsDay = parseIsoDate(iso).getDay(); // 0 = domingo
  const distanceToMonday = jsDay === 0 ? 6 : jsDay - 1;
  return addDays(iso, -distanceToMonday);
}

/** Las 7 fechas (lunes a domingo) de la semana que contiene `iso`. */
export function weekDates(iso: string): string[] {
  const monday = startOfWeek(iso);
  return WEEK_DAYS.map((_, i) => addDays(monday, i));
}

export function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

/** Fechas de un mes (month0 = 0..11). */
export function monthDates(year: number, month0: number): string[] {
  const total = daysInMonth(year, month0);
  return Array.from({ length: total }, (_, i) => toIsoDate(new Date(year, month0, i + 1, 12)));
}

/** Cantidad de celdas vacías antes del día 1 en una grilla que empieza el lunes. */
export function mondayOffset(year: number, month0: number): number {
  return (new Date(year, month0, 1).getDay() + 6) % 7;
}

export function dayOfMonth(iso: string): number {
  return Number(iso.slice(8, 10));
}

// ------------------------------------------------------------------------------
// Zonas horarias (usado en el servidor, que corre en UTC)
// ------------------------------------------------------------------------------

export const DEFAULT_TIMEZONE = "America/Argentina/Buenos_Aires";

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || tz.length === 0 || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function partsInZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** Fecha "YYYY-MM-DD" de un instante en una zona horaria. */
export function isoDateInZone(date: Date, timeZone: string): string {
  const p = partsInZone(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function zoneOffsetMs(date: Date, timeZone: string): number {
  const p = partsInZone(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - (date.getTime() - date.getMilliseconds());
}

/** Convierte una fecha + hora de pared en `timeZone` al instante UTC real. */
export function zonedTimeToUtc(isoDate: string, time: string, timeZone: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm, 0);
  const firstOffset = zoneOffsetMs(new Date(guess), timeZone);
  const candidate = guess - firstOffset;
  // Segunda pasada por si el offset cambia entre guess y candidate (DST).
  const secondOffset = zoneOffsetMs(new Date(candidate), timeZone);
  return new Date(guess - secondOffset);
}
