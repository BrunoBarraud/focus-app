import { CALENDAR_COLORS } from "./calendar-colors";
import type { Tables } from "./database.types";
import type {
  Calendar,
  Dream,
  DreamCategory,
  DreamStatus,
  EnergyLevel,
  Goal,
  GoalTimeframe,
  Habit,
  HabitCategory,
  MorningRitual,
  PlannerEvent,
  SupportFeedback,
  SupportFeedbackPriority,
  SupportFeedbackStatus,
  SupportFeedbackType,
  TaskPriority,
  WeekDay,
} from "./types";

// Las columnas de texto no son enums en la base: se validan al leer para no
// propagar valores inválidos con `as any`.
function oneOf<T extends string>(value: string | null | undefined, allowed: readonly T[], fallback: T): T {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

const HABIT_CATEGORIES = ["cuerpo", "mente", "trabajo", "espiritu"] as const;
const PRIORITIES = ["high", "medium", "low"] as const;
const WEEK_DAYS = ["L", "M", "X", "J", "V", "S", "D"] as const;
const TIMEFRAMES = ["Q1", "Q2", "Q3", "Q4", "Anual"] as const;
const ENERGY = ["low", "medium", "high", "peak"] as const;
const DREAM_CATEGORIES = ["Viajes", "Finanzas", "Experiencias", "Impacto", "Creatividad"] as const;
const DREAM_STATUS = ["pending", "in_progress", "completed"] as const;
const FEEDBACK_TYPES = ["suggestion", "improvement", "bug", "question", "other"] as const;
const FEEDBACK_STATUS = ["pending", "in_review", "resolved", "dismissed"] as const;


type HabitRow = Pick<Tables<"habits">, "id" | "title" | "category" | "monthly_target_days" | "color"> & {
  habit_logs: Pick<Tables<"habit_logs">, "date" | "completed">[] | null;
};

export function mapHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    name: row.title,
    category: oneOf<HabitCategory>(row.category, HABIT_CATEGORIES, "mente"),
    monthlyTargetDays: row.monthly_target_days ?? 25,
    color: row.color ?? "#10b981",
    completedDates: (row.habit_logs ?? []).filter((l) => l.completed).map((l) => l.date),
  };
}

const hhmm = (value: string | null) => (value ? value.slice(0, 5) : undefined);

export function mapEvent(row: Tables<"calendar_events">): PlannerEvent {
  const days = (row.days_of_week ?? []).filter((d): d is WeekDay =>
    (WEEK_DAYS as readonly string[]).includes(d)
  );
  return {
    id: row.id,
    calendarId: row.calendar_id,
    title: row.title,
    description: row.description ?? undefined,
    recurring: Boolean(row.is_recurring) || !row.date,
    date: row.date ?? undefined,
    daysOfWeek: days,
    startTime: hhmm(row.start_time),
    endTime: hhmm(row.end_time),
    priority: oneOf<TaskPriority>(row.priority, PRIORITIES, "medium"),
    estimatedMinutes: row.estimated_minutes ?? undefined,
    tag: row.tag ?? "General",
  };
}

export function mapCalendar(row: Tables<"calendars">, index: number): Calendar {
  return {
    id: row.id,
    name: row.name,
    // El color guardado es una clase de Tailwind elegida de esta lista; si no
    // coincide (datos viejos), se asigna uno estable por posición.
    color: (CALENDAR_COLORS as readonly string[]).includes(row.color)
      ? row.color
      : CALENDAR_COLORS[index % CALENDAR_COLORS.length],
  };
}

type GoalRow = Tables<"goals"> & {
  goal_milestones: Pick<Tables<"goal_milestones">, "id" | "title" | "completed" | "position">[] | null;
};

export function progressOf(milestones: { completed: boolean }[]): number {
  if (milestones.length === 0) return 0;
  return Math.round((milestones.filter((m) => m.completed).length / milestones.length) * 100);
}

export function mapGoal(row: GoalRow): Goal {
  const milestones = [...(row.goal_milestones ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((m) => ({ id: m.id, title: m.title, completed: m.completed }));
  return {
    id: row.id,
    title: row.title,
    category: row.type === "profesional" ? "professional" : "personal",
    progress: milestones.length > 0 ? progressOf(milestones) : Number(row.progress ?? 0),
    targetDate: row.target_date,
    timeframe: oneOf<GoalTimeframe>(row.timeframe, TIMEFRAMES, "Anual"),
    milestones,
  };
}

export function mapDream(row: Tables<"dreams">): Dream {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    category: oneOf<DreamCategory>(row.category, DREAM_CATEGORIES, "Experiencias"),
    status: oneOf<DreamStatus>(row.status, DREAM_STATUS, "pending"),
    targetYear: row.target_year ?? undefined,
  };
}

export function mapRitual(row: Pick<
  Tables<"user_settings">,
  "daily_mission" | "daily_pillar" | "daily_frog" | "energy_level"
> | null): MorningRitual {
  return {
    mission: row?.daily_mission || "Definí la misión principal de hoy.",
    pillar: row?.daily_pillar || "Claridad & Presencia",
    frog: row?.daily_frog || "Elegí la tarea más importante del día.",
    energyLevel: oneOf<EnergyLevel>(row?.energy_level, ENERGY, "high"),
  };
}

export function mapFeedback(row: Tables<"support_feedback">): SupportFeedback {
  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    userEmail: row.user_email,
    userName: row.user_name,
    type: oneOf<SupportFeedbackType>(row.type, FEEDBACK_TYPES, "other"),
    title: row.title,
    description: row.description,
    rating: row.rating ?? undefined,
    priority: oneOf<SupportFeedbackPriority>(row.priority, PRIORITIES, "medium"),
    status: oneOf<SupportFeedbackStatus>(row.status, FEEDBACK_STATUS, "pending"),
    adminResponse: row.admin_response ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
