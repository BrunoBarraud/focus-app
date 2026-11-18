// Opciones de recordatorio (minutos antes del inicio).

export const REMINDER_OPTIONS = [0, 5, 10, 15, 30, 60, 120, 1440, 2880, 10080] as const;
export const MAX_REMINDERS = 6;
/** Tope: 4 semanas antes. */
export const MAX_REMINDER_MINUTES = 40320;

export function reminderLabel(minutes: number): string {
  if (minutes === 0) return "Al empezar";
  if (minutes < 60) return `${minutes} min antes`;
  if (minutes < 1440) {
    const h = minutes / 60;
    return `${Number.isInteger(h) ? h : h.toFixed(1)} ${h === 1 ? "hora" : "horas"} antes`;
  }
  if (minutes % 10080 === 0) {
    const w = minutes / 10080;
    return `${w} ${w === 1 ? "semana" : "semanas"} antes`;
  }
  const d = Math.round(minutes / 1440);
  return `${d} ${d === 1 ? "día" : "días"} antes`;
}

/** Hora a la que se avisa un evento de todo el día ("1 día antes" = el día anterior a esta hora). */
export const ALL_DAY_REMINDER_TIME = "09:00";
