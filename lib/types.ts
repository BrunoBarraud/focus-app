export type EnergyLevel = "low" | "medium" | "high" | "peak";

export interface MorningRitual {
  date: string;
  mission: string;
  pillar: string;
  frog: string; // El SAPO de hoy
  energyLevel: EnergyLevel;
  quote: {
    text: string;
    author: string;
  };
  completed: boolean;
}

export type HabitCategory = "cuerpo" | "mente" | "trabajo" | "espiritu";

export interface Habit {
  id: string;
  name: string;
  category: HabitCategory;
  streak: number;
  bestStreak: number;
  monthlyTargetDays: number;
  completedDays: Record<number, boolean>; // day number -> boolean
  color: string;
  iconName?: string;
}

export type WeekDay = "L" | "M" | "X" | "J" | "V" | "S" | "D";

export interface PlannerTask {
  id: string;
  title: string;
  description?: string;
  day: WeekDay;
  scheduledDate?: string;
  scheduledTime?: string; // Formato HH:MM, ej. "10:30"
  priority: "high" | "medium" | "low";
  estimatedMinutes: number;
  completed: boolean;
  tag: string;
}

export type GoalCategory = "personal" | "professional";

export interface Goal {
  id: string;
  title: string;
  category: GoalCategory;
  progress: number; // 0 - 100
  targetDate: string;
  timeframe: "Q1" | "Q2" | "Q3" | "Q4" | "Anual";
  milestones: {
    id: string;
    title: string;
    completed: boolean;
  }[];
}

export interface WheelArea {
  subject: string;
  score: number; // 1 - 10
  fullMark: number; // 10
  description: string;
}

export interface Dream {
  id: string;
  title: string;
  description: string;
  category: "Viajes" | "Finanzas" | "Experiencias" | "Impacto" | "Creatividad";
  status: "pending" | "in_progress" | "completed";
  targetYear?: number;
}

export type PomodoroMode = "focus" | "short_break" | "long_break";

export interface PomodoroState {
  mode: PomodoroMode;
  timeLeft: number;
  isRunning: boolean;
  sessionsCompletedToday: number;
  totalFocusMinutesToday: number;
  selectedTaskId?: string;
}

export interface LifeExpectancyStats {
  weeksLived: number;
  totalWeeks: number;
  currentAgeYears: number;
  targetAgeYears: number;
  senecaQuote: string;
}

// ==============================================================================
// ROLES DE USUARIO Y SOPORTE & FEEDBACK
// ==============================================================================

export type UserRole = "admin" | "user";

export type SupportFeedbackType =
  | "suggestion"   // Sugerencia de nueva función
  | "improvement"  // Mejora de diseño o experiencia de uso
  | "bug"          // Reporte de error
  | "question"     // Consulta de soporte
  | "other";       // Otro

export type SupportFeedbackStatus =
  | "pending"      // Pendiente de revisión
  | "in_review"    // En revisión / Analizando
  | "resolved"     // Resuelto / Implementado
  | "dismissed";   // Descartado

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

