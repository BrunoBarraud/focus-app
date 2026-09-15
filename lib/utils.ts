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
 * Devuelve el número de días del mes actual (o el mes especificado)
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
 * Cuenta días consecutivos hacia atrás desde hoy.
 */
export function calculateStreak(completedDays: Record<number, boolean>): number {
  const today = new Date().getDate();
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

