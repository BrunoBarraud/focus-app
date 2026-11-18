import { CALENDAR_COLOR_ORDER, isColorKey, normalizeColor } from "./colors";
import { isIsoDate } from "./dates";
import { DEFAULT_SCHEDULE } from "./timetable";
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
  Recurrence,
  RecurrenceFreq,
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

const FREQS = ["daily", "weekly", "monthly", "yearly"] as const;

function isWeekDay(value: unknown): value is WeekDay {
  return typeof value === "string" && (WEEK_DAYS as readonly string[]).includes(value);
}

/** Valida el JSON de repetición; cualquier cosa rara se descarta (= no se repite). */
export function parseRecurrence(value: unknown): Recurrence | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const v = value as Record<string, unknown>;
  if (!(FREQS as readonly unknown[]).includes(v.freq)) return undefined;
  const rule: Recurrence = {
    freq: v.freq as RecurrenceFreq,
    interval: typeof v.interval === "number" && v.interval >= 1 ? Math.floor(v.interval) : 1,
  };
  if (Array.isArray(v.byWeekday)) {
    const days = v.byWeekday.filter(isWeekDay);
    if (days.length) rule.byWeekday = days;
  }
  if (v.monthlyMode === "nth" || v.monthlyMode === "day") rule.monthlyMode = v.monthlyMode;
  if (isIsoDate(v.until)) rule.until = v.until;
  if (typeof v.count === "number" && v.count >= 1) rule.count = Math.floor(v.count);
  return rule;
}

function createdDate(row: { created_at: string }): string {
  return row.created_at.slice(0, 10);
}

export function mapEvent(row: Tables<"calendar_events">): PlannerEvent {
  // Compatibilidad: filas sin convertir por la migración del calendario
  // completo (start_date vacío) se leen con el modelo viejo.
  const legacy = !row.start_date;
  const legacyDays = (row.days_of_week ?? []).filter(isWeekDay);
  const startDate = row.start_date ?? row.date ?? createdDate(row);
  const recurrence = legacy
    ? row.is_recurring || !row.date
      ? ({ freq: "weekly", interval: 1, byWeekday: legacyDays } satisfies Recurrence)
      : undefined
    : parseRecurrence(row.recurrence);

  const startTime = hhmm(row.start_time);
  const endTime = hhmm(row.end_time);
  return {
    id: row.id,
    calendarId: row.calendar_id,
    title: row.title,
    description: row.description ?? undefined,
    kind: legacy ? (startTime && endTime ? "event" : "task") : row.kind === "event" ? "event" : "task",
    allDay: Boolean(row.all_day),
    startDate,
    endDate: row.end_date && row.end_date > startDate ? row.end_date : undefined,
    startTime,
    endTime,
    recurrence,
    reminders: Array.isArray(row.reminders) ? row.reminders.filter((n) => Number.isFinite(n) && n >= 0) : undefined,
    location: row.location ?? undefined,
    url: row.url ?? undefined,
    color: isColorKey(row.color) ? row.color : undefined,
    priority: oneOf<TaskPriority>(row.priority, PRIORITIES, "medium"),
    estimatedMinutes: row.estimated_minutes ?? undefined,
    tag: row.tag ?? "General",
  };
}

export function mapCalendar(row: Tables<"calendars">, index: number): Calendar {
  return {
    id: row.id,
    name: row.name,
    // Acepta la clave nueva ("violet") y el formato viejo ("bg-violet-500 …").
    color: normalizeColor(row.color, CALENDAR_COLOR_ORDER[index % CALENDAR_COLOR_ORDER.length]),
    icon: row.icon ?? undefined,
    hidden: Boolean(row.hidden),
    position: row.position ?? index,
    defaultReminders: Array.isArray(row.default_reminders) ? row.default_reminders : [30, 15, 5],
    useSlots: Boolean(row.use_slots),
    schedule: {
      start: hhmm(row.slot_start) ?? DEFAULT_SCHEDULE.start,
      slotMinutes: row.slot_minutes ?? DEFAULT_SCHEDULE.slotMinutes,
      gapMinutes: row.slot_gap_minutes ?? DEFAULT_SCHEDULE.gapMinutes,
      end: hhmm(row.day_end) ?? DEFAULT_SCHEDULE.end,
    },
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
    // Vacío = el usuario todavía no lo escribió; la UI muestra un placeholder.
    mission: row?.daily_mission ?? "",
    pillar: row?.daily_pillar ?? "",
    frog: row?.daily_frog ?? "",
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
