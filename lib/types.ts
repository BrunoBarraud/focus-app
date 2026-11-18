// ==============================================================================
// TIPOS DE DOMINIO (lo que consumen los componentes)
// Los tipos de las tablas están en lib/database.types.ts.
// ==============================================================================

export type EnergyLevel = "low" | "medium" | "high" | "peak";

export interface MorningRitual {
  mission: string;
  pillar: string;
  frog: string; // El SAPO de hoy
  energyLevel: EnergyLevel;
}

export type HabitCategory = "cuerpo" | "mente" | "trabajo" | "espiritu";

/** Hábito tal como viene del servidor: fechas ISO (YYYY-MM-DD) cumplidas. */
export interface Habit {
  id: string;
  name: string;
  category: HabitCategory;
  monthlyTargetDays: number;
  color: string;
  completedDates: string[];
}

/** Hábito proyectado sobre el mes local del usuario (se calcula en el cliente). */
export interface HabitMonthView extends Habit {
  completedDays: Record<number, boolean>;
  streak: number;
  bestStreak: number;
}

/** Bloques horarios de un calendario (estilo grilla de facultad). */
export interface CalendarSchedule {
  start: string; // HH:MM del primer bloque
  slotMinutes: number;
  gapMinutes: number;
  end: string; // HH:MM: el último bloque tiene que terminar antes
}

export interface Calendar {
  id: string;
  name: string;
  /** Clave de la paleta (lib/colors.ts). */
  color: string;
  /** Emoji opcional que acompaña al nombre. */
  icon?: string;
  /** Oculto: sus eventos no se muestran en las vistas. */
  hidden: boolean;
  position: number;
  /** Minutos antes para avisar, si el evento no define los suyos. */
  defaultReminders: number[];
  /** Si las vistas Día/Semana usan los bloques horarios de este calendario. */
  useSlots: boolean;
  schedule: CalendarSchedule;
}

export type WeekDay = "L" | "M" | "X" | "J" | "V" | "S" | "D";
export type TaskPriority = "high" | "medium" | "low";
export type EventKind = "task" | "event";
export type RecurrenceFreq = "daily" | "weekly" | "monthly" | "yearly";

/** Regla de repetición (estilo RRULE, simplificada). */
export interface Recurrence {
  freq: RecurrenceFreq;
  /** Cada cuántas unidades (cada 2 semanas = 2). */
  interval: number;
  /** Semanal: días en que se repite. Vacío = el día de la fecha de inicio. */
  byWeekday?: WeekDay[];
  /** Mensual: el mismo número de día ("day") o "el segundo martes" ("nth"). */
  monthlyMode?: "day" | "nth";
  /** Última fecha posible (inclusive). */
  until?: string;
  /** Cantidad total de repeticiones. */
  count?: number;
}

/**
 * Tarea o evento del calendario.
 *  - `kind`: "task" se tilda; "event" tiene inicio y fin (una clase, un final).
 *  - `startDate`/`endDate`: primer día y, si dura varios días, el último.
 *  - `recurrence`: cómo se repite (sin regla = una sola vez).
 * El completado es por ocurrencia (ver `completions`).
 */
export interface PlannerEvent {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  kind: EventKind;
  allDay: boolean;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD, solo si dura más de un día
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  recurrence?: Recurrence;
  /** Minutos antes para avisar. undefined = los del calendario. */
  reminders?: number[];
  location?: string;
  url?: string;
  /** Clave de la paleta; undefined = el color del calendario. */
  color?: string;
  priority: TaskPriority;
  estimatedMinutes?: number;
  tag: string;
}

/** Ocurrencia concreta de un evento: empieza en `occurrenceDate`. */
export interface PlannerOccurrence extends PlannerEvent {
  occurrenceDate: string;
  /** Último día de esta ocurrencia (igual a occurrenceDate si es de un día). */
  occurrenceEndDate: string;
  completed: boolean;
}

export interface PlannerData {
  events: PlannerEvent[];
  /** Claves `${eventId}|${YYYY-MM-DD}` de las ocurrencias completadas. */
  completions: string[];
  calendars: Calendar[];
}

export type GoalCategory = "personal" | "professional";
export type GoalTimeframe = "Q1" | "Q2" | "Q3" | "Q4" | "Anual";

export interface GoalMilestone {
  id: string;
  title: string;
  completed: boolean;
}

export interface Goal {
  id: string;
  title: string;
  category: GoalCategory;
  progress: number; // 0 - 100, derivado de los hitos
  targetDate: string | null; // YYYY-MM-DD
  timeframe: GoalTimeframe;
  milestones: GoalMilestone[];
}

export interface StreakInfo {
  current: number;
  best: number;
}

export interface WheelArea {
  subject: string;
  score: number | null; // 1 - 10, null = todavía sin evaluar
  fullMark: number; // 10
  description: string;
}

export type DreamCategory = "Viajes" | "Finanzas" | "Experiencias" | "Impacto" | "Creatividad";
export type DreamStatus = "pending" | "in_progress" | "completed";

export interface Dream {
  id: string;
  title: string;
  description: string;
  category: DreamCategory;
  status: DreamStatus;
  targetYear?: number;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  url: string;
  scheduledFor: string;
  readAt: string | null;
}

// ==============================================================================
// SESIÓN, ROLES Y SOPORTE
// ==============================================================================

export type UserRole = "admin" | "user";

/** Datos mínimos y serializables del usuario logueado para la UI. */
export interface Viewer {
  id: string;
  email: string;
  fullName: string;
  firstName: string;
  role: UserRole;
}

export type SupportFeedbackType =
  | "suggestion" // Sugerencia de nueva función
  | "improvement" // Mejora de diseño o experiencia de uso
  | "bug" // Reporte de error
  | "question" // Consulta de soporte
  | "other"; // Otro

export type SupportFeedbackStatus =
  | "pending" // Pendiente de revisión
  | "in_review" // En revisión / Analizando
  | "resolved" // Resuelto / Implementado
  | "dismissed"; // Descartado

export type SupportFeedbackPriority = "low" | "medium" | "high";

export interface SupportFeedback {
  id: string;
  userId?: string;
  userEmail: string;
  userName: string;
  type: SupportFeedbackType;
  title: string;
  description: string;
  rating?: number; // 1 a 5 estrellas
  priority: SupportFeedbackPriority;
  status: SupportFeedbackStatus;
  adminResponse?: string;
  createdAt: string;
  updatedAt: string;
}

/** Resultado estándar de las server actions. */
export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };
