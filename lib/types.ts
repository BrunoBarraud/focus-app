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

export interface Calendar {
  id: string;
  name: string;
  color: string;
}

export type WeekDay = "L" | "M" | "X" | "J" | "V" | "S" | "D";
export type TaskPriority = "high" | "medium" | "low";

/**
 * Evento del planificador. Puede ser:
 *  - puntual: `recurring = false` y `date` con la fecha (YYYY-MM-DD)
 *  - semanal: `recurring = true` y `daysOfWeek` con los días en que se repite
 * El completado es por ocurrencia (ver `completions`).
 */
export interface PlannerEvent {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  recurring: boolean;
  date?: string;
  daysOfWeek: WeekDay[];
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  priority: TaskPriority;
  estimatedMinutes?: number;
  tag: string;
}

/** Ocurrencia concreta de un evento en una fecha. */
export interface PlannerOccurrence extends PlannerEvent {
  occurrenceDate: string;
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

export interface WheelArea {
  subject: string;
  score: number; // 0 - 10
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
