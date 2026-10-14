import { addDays, dayOfMonth, daysInMonth, parseIsoDate } from "./dates";
import type { Habit, HabitMonthView } from "./types";

/**
 * Racha actual: días consecutivos cumplidos hasta hoy. Si hoy todavía no se
 * marcó, la racha cuenta desde ayer (no se "rompe" a la mañana).
 */
export function currentStreak(done: ReadonlySet<string>, today: string): number {
  let cursor = done.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (done.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Racha más larga dentro de las fechas disponibles. */
export function bestStreak(dates: readonly string[]): number {
  const sorted = [...new Set(dates)].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const date of sorted) {
    run = prev !== null && addDays(prev, 1) === date ? run + 1 : 1;
    best = Math.max(best, run);
    prev = date;
  }
  return best;
}

/** Proyecta un hábito sobre el mes de `today` (fecha local del usuario). */
export function toMonthView(habit: Habit, today: string): HabitMonthView {
  const monthPrefix = today.slice(0, 7);
  const done = new Set(habit.completedDates);
  const completedDays: Record<number, boolean> = {};
  for (const date of habit.completedDates) {
    if (date.startsWith(monthPrefix)) completedDays[dayOfMonth(date)] = true;
  }
  return {
    ...habit,
    completedDays,
    streak: currentStreak(done, today),
    bestStreak: bestStreak(habit.completedDates),
  };
}

export function monthLength(today: string): number {
  const d = parseIsoDate(today);
  return daysInMonth(d.getFullYear(), d.getMonth());
}

/** Fecha ISO del día `day` del mes de `today`. */
export function dateForDay(today: string, day: number): string {
  return `${today.slice(0, 7)}-${String(day).padStart(2, "0")}`;
}
