import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { LifeExpectancyStats } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Obtiene la fecha local del usuario en formato YYYY-MM-DD usando Intl (inmune a desfases UTC).
 */
export function getLocalTodayIso(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

/**
 * Obtiene el número de día actual (1-31) en la zona horaria local.
 */
export function getLocalDay(date: Date = new Date()): number {
  const iso = getLocalTodayIso(date);
  return parseInt(iso.split("-")[2], 10);
}

/**
 * Parsea un string "YYYY-MM-DD" a un Date en hora local (evita que el constructor Date(string) asuma UTC 00:00 y reste 1 día).
 */
export function parseLocalDate(isoDate: string): Date {
  const parts = isoDate.split("-").map(Number);
  const year = parts[0];
  const month = parts[1] - 1;
  const day = parts[2];
  return new Date(year, month, day, 12, 0, 0);
}

/**
 * Formatea una fecha en español respetando la zona horaria local.
 */
export function formatLocalDateEs(
  dateOrIso: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof dateOrIso === "string" ? parseLocalDate(dateOrIso) : dateOrIso;
  return new Intl.DateTimeFormat(
    "es-ES",
    options || {
      weekday: "long",
      day: "numeric",
      month: "long",
    }
  ).format(d);
}

/**
 * Devuelve el número de días del mes especificado (o actual)
 */
export function getDaysInMonth(year?: number, month?: number): number {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth() + 1; // 1-based
  return new Date(y, m, 0).getDate();
}

/**
 * Calcula la racha consecutiva real de un hábito.
 * Recibe un Record<number, boolean> donde la clave es el día del mes (1-31).
 * Cuenta días consecutivos hacia atrás desde hoy (en hora local).
 */
export function calculateStreak(
  completedDays: Record<number, boolean>,
  todayDayNumber?: number
): number {
  const today = todayDayNumber ?? getLocalDay();
  let streak = 0;

  for (let day = today; day >= 1; day--) {
    if (completedDays[day]) {
      streak++;
    } else {
      break; // Se rompe la racha al primer día no completado
    }
  }

  return streak;
}

/**
 * Calcula las semanas vividas vs expectativa de vida a partir de una fecha de nacimiento
 */
export function calculateMementoMori(
  birthDateStr: string,
  targetAge: number = 80
): LifeExpectancyStats {
  const birthDate = new Date(birthDateStr);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - birthDate.getTime());
  const msPerWeek = 1000 * 60 * 60 * 24 * 7;
  const weeksLived = Math.floor(diffMs / msPerWeek);
  const totalWeeks = targetAge * 52;
  const currentAgeYears = Math.floor(weeksLived / 52);

  return {
    weeksLived,
    totalWeeks,
    currentAgeYears,
    targetAgeYears: targetAge,
    senecaQuote: "No es que tengamos poco tiempo, sino que perdemos mucho.",
  };
}

