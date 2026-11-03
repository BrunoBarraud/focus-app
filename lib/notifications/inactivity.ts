import { addDays, hourInZone, isoDateInZone } from "@/lib/dates";

// Lógica pura de los avisos por inactividad (sin base de datos), para poder
// testearla. El cron la usa en lib/notifications/reminders.ts.

/** Frecuencias que el usuario puede elegir, en horas. */
export const INACTIVITY_OPTIONS = [1, 2, 5, 7, 12] as const;
export type InactivityHours = (typeof INACTIVITY_OPTIONS)[number];

export function isInactivityHours(value: unknown): value is InactivityHours {
  return typeof value === "number" && (INACTIVITY_OPTIONS as readonly number[]).includes(value);
}

/** Fuera de este horario (hora local del usuario) no se manda nada. */
export const QUIET_HOURS = { from: 22, until: 9 } as const;
/** Hora local a la que se avisa que la racha está por cortarse. */
export const STREAK_RISK_HOUR = 20;

export function isQuietHour(hour: number): boolean {
  return hour >= QUIET_HOURS.from || hour < QUIET_HOURS.until;
}

export interface InactivityInput {
  userId: string;
  now: Date;
  lastSeenAt: Date;
  everyHours: InactivityHours;
  timeZone: string;
  streakCurrent: number;
  /** Último día (local, YYYY-MM-DD) en que usó la app. */
  streakLastDay: string | null;
}

export interface PlannedNudge {
  user_id: string;
  kind: "inactivity" | "streak_risk";
  dedupe_key: string;
  title: string;
  body: string;
  url: string;
  scheduled_for: string;
}

function hoursLabel(hours: number): string {
  return hours === 1 ? "1 hora" : `${hours} horas`;
}

function daysLabel(days: number): string {
  return days === 1 ? "1 día" : `${days} días`;
}

/**
 * Decide qué avisos corresponden en este momento (0, 1 o 2). Es idempotente
 * gracias a `dedupe_key`: el cron corre cada minuto y la base descarta los
 * repetidos.
 *
 * - Aviso de inactividad: cuando pasan `everyHours` sin usar la app, y de nuevo
 *   cada vez que se cumplen otras `everyHours` (1 por "tramo").
 * - Racha en riesgo: a las 20 h si ayer usó la app, hoy todavía no y la racha
 *   es de 2 días o más. Uno por día.
 * - Nunca entre las 22 y las 9 (hora local).
 */
export function planInactivityNudges(input: InactivityInput): PlannedNudge[] {
  const { userId, now, lastSeenAt, everyHours, timeZone, streakCurrent, streakLastDay } = input;
  const hour = hourInZone(now, timeZone);
  if (isQuietHour(hour)) return [];

  const nudges: PlannedNudge[] = [];
  const today = isoDateInZone(now, timeZone);
  const usedToday = streakLastDay === today;
  const streakAtRisk = streakCurrent >= 2 && streakLastDay === addDays(today, -1);

  if (streakAtRisk && hour >= STREAK_RISK_HOUR) {
    nudges.push({
      user_id: userId,
      kind: "streak_risk",
      dedupe_key: `streak_risk:${userId}:${today}`,
      title: `🔥 Tu racha de ${daysLabel(streakCurrent)} se corta hoy`,
      body: "Todavía no entraste a Focus. Abrila antes de medianoche para no perderla.",
      url: "/dashboard",
      scheduled_for: now.toISOString(),
    });
  }

  const elapsedHours = (now.getTime() - lastSeenAt.getTime()) / 3_600_000;
  if (elapsedHours >= everyHours) {
    const slot = Math.floor(elapsedHours / everyHours);
    const elapsed = hoursLabel(Math.floor(elapsedHours));
    let title = "¿Seguimos?";
    let body = `Hace ${elapsed} que no entrás a Focus. Fijate qué te queda para hoy.`;
    if (streakAtRisk) {
      title = `🔥 No pierdas tu racha de ${daysLabel(streakCurrent)}`;
      body = `Hace ${elapsed} que no entrás y hoy todavía no abriste Focus.`;
    } else if (usedToday && streakCurrent > 0) {
      title = `🔥 ${daysLabel(streakCurrent)} seguidos`;
      body = `Hace ${elapsed} que no entrás a Focus. Pasá a marcar tus hábitos y tareas.`;
    }

    nudges.push({
      user_id: userId,
      kind: "inactivity",
      // Un aviso por tramo de inactividad. Si el usuario vuelve, last_seen_at
      // cambia y empieza una serie nueva.
      dedupe_key: `inactivity:${userId}:${lastSeenAt.toISOString()}:${slot}`,
      title,
      body,
      url: "/dashboard",
      scheduled_for: now.toISOString(),
    });
  }

  return nudges;
}

/** Racha que se muestra: si el último día de uso fue antes de ayer, ya se cortó. */
export function visibleStreak(streakCurrent: number, streakLastDay: string | null, today: string): number {
  if (!streakLastDay) return 0;
  return streakLastDay === today || streakLastDay === addDays(today, -1) ? streakCurrent : 0;
}
