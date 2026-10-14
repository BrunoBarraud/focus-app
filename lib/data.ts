import "server-only";
import { redirect } from "next/navigation";
import { getSession, isAdminUser } from "./auth";
import { addDays, toIsoDate } from "./dates";
import {
  mapCalendar,
  mapDream,
  mapEvent,
  mapFeedback,
  mapGoal,
  mapHabit,
  mapRitual,
} from "./mappers";
import { completionKey } from "./planner";
import type {
  AppNotification,
  Dream,
  Goal,
  Habit,
  MorningRitual,
  PlannerData,
  SupportFeedback,
  WheelArea,
} from "./types";

// ==============================================================================
// LECTURAS DEL SERVIDOR
// Todas exigen sesión y LANZAN si Supabase devuelve error: la página muestra el
// error boundary en vez de pintar datos vacíos (o de demo) como si fueran reales.
// ==============================================================================

async function requireSession() {
  const { supabase, user } = await getSession();
  // proxy.ts ya protege las rutas; esto cubre una sesión que expiró a mitad de camino.
  if (!user) redirect("/login");
  return { supabase, user };
}

function check<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`Error al cargar ${what}: ${result.error.message}`);
  return result.data as T;
}

// El servidor corre en UTC y no conoce la fecha local del usuario: se trae una
// ventana amplia y el cliente proyecta sobre su propio "hoy".
const HABIT_HISTORY_DAYS = 400;
const PLANNER_WINDOW_DAYS = 45;

export async function getHabits(): Promise<Habit[]> {
  const { supabase, user } = await requireSession();
  const since = addDays(toIsoDate(new Date()), -HABIT_HISTORY_DAYS);
  const rows = check(
    await supabase
      .from("habits")
      .select("id, title, category, monthly_target_days, color, habit_logs(date, completed)")
      .eq("user_id", user.id)
      .gte("habit_logs.date", since)
      .order("created_at", { ascending: true }),
    "hábitos"
  );
  return rows.map(mapHabit);
}

/** Eventos del planificador + completados en [from, to] (fechas ISO). */
export async function getPlannerData(range?: { from: string; to: string }): Promise<PlannerData> {
  const { supabase, user } = await requireSession();
  const today = toIsoDate(new Date());
  const from = range?.from ?? addDays(today, -PLANNER_WINDOW_DAYS);
  const to = range?.to ?? addDays(today, PLANNER_WINDOW_DAYS);

  const [events, completions, calendars] = await Promise.all([
    supabase.from("calendar_events").select("*").eq("user_id", user.id).order("created_at"),
    supabase
      .from("event_completions")
      .select("event_id, date")
      .eq("user_id", user.id)
      .gte("date", from)
      .lte("date", to),
    supabase.from("calendars").select("*").eq("user_id", user.id).order("created_at"),
  ]);

  return {
    events: check(events, "tareas").map(mapEvent),
    completions: check(completions, "tareas completadas").map((c) => completionKey(c.event_id, c.date)),
    calendars: check(calendars, "calendarios").map(mapCalendar),
  };
}

export async function getGoals(): Promise<Goal[]> {
  const { supabase, user } = await requireSession();
  const rows = check(
    await supabase
      .from("goals")
      .select("*, goal_milestones(id, title, completed, position)")
      .eq("user_id", user.id)
      .in("type", ["personal", "profesional"])
      .order("created_at", { ascending: false }),
    "metas"
  );
  return rows.map(mapGoal);
}

export const DEFAULT_WHEEL_AREAS: WheelArea[] = [
  { subject: "Salud & Energía", score: 8, fullMark: 10, description: "Nutrición, fuerza, descanso y resistencia cardiovascular" },
  { subject: "Familia & Pareja", score: 8, fullMark: 10, description: "Vínculos de confianza, tiempo presente y calidad compartida" },
  { subject: "Carrera & Negocio", score: 7, fullMark: 10, description: "Impacto, liderazgo de proyectos y retos profesionales" },
  { subject: "Finanzas", score: 7, fullMark: 10, description: "Patrimonio neto, ahorro e inversiones diversificadas" },
  { subject: "Desarrollo Personal", score: 8, fullMark: 10, description: "Lectura, autocontrol, nuevas habilidades técnicas" },
  { subject: "Espiritualidad", score: 7, fullMark: 10, description: "Meditación, ecuanimidad y gratitud diaria" },
  { subject: "Ocio & Aventuras", score: 6, fullMark: 10, description: "Viajes, aficiones, naturaleza y tiempo no productivo" },
  { subject: "Entorno Físico", score: 8, fullMark: 10, description: "Espacio de trabajo minimalista y hogar ordenado" },
];

export async function getWheelOfLife(): Promise<WheelArea[]> {
  const { supabase, user } = await requireSession();
  const rows = check(
    await supabase
      .from("goals")
      .select("title, score, description")
      .eq("user_id", user.id)
      .eq("type", "rueda")
      .order("created_at"),
    "rueda de la vida"
  );

  if (rows.length > 0) {
    return rows.map((r) => ({
      subject: r.title,
      score: Number(r.score ?? 7),
      fullMark: 10,
      description: r.description ?? "",
    }));
  }

  // Primera visita: sembrar las áreas por defecto. El índice único parcial
  // (user_id, title) WHERE type='rueda' hace fallar con 23505 al request que
  // llegue segundo; ese error significa "ya estaban sembradas" y se ignora.
  const { error } = await supabase.from("goals").insert(
    DEFAULT_WHEEL_AREAS.map((a) => ({
      user_id: user.id,
      type: "rueda",
      title: a.subject,
      description: a.description,
      score: a.score,
    }))
  );
  if (error && error.code !== "23505") {
    console.error("No se pudieron sembrar las áreas de la rueda:", error.message);
  }
  return DEFAULT_WHEEL_AREAS;
}

export async function getDreams(): Promise<Dream[]> {
  const { supabase, user } = await requireSession();
  const rows = check(
    await supabase
      .from("dreams")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    "sueños"
  );
  return rows.map(mapDream);
}

export async function getMorningRitual(): Promise<MorningRitual> {
  const { supabase, user } = await requireSession();
  const row = check(
    await supabase
      .from("user_settings")
      .select("daily_mission, daily_pillar, daily_frog, energy_level")
      .eq("user_id", user.id)
      .maybeSingle(),
    "prioridades"
  );
  return mapRitual(row);
}

export async function getProfile() {
  const { supabase, user } = await requireSession();
  const { data: row, error } = await supabase
    .from("user_settings")
    .select("birth_date, target_age, timezone")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error(`Error al cargar perfil: ${error.message}`);
  return {
    birthDate: row?.birth_date ?? "",
    targetAge: row?.target_age ?? 80,
    timezone: row?.timezone ?? null,
  };
}

/** Admin: todos los tickets. Usuario: solo los propios (RLS hace cumplir lo mismo). */
export async function getFeedbacks(): Promise<SupportFeedback[]> {
  const { supabase, user } = await requireSession();
  let query = supabase.from("support_feedback").select("*").order("created_at", { ascending: false });
  if (!isAdminUser(user)) query = query.eq("user_id", user.id);
  return check(await query, "tickets de soporte").map(mapFeedback);
}

export async function getNotifications(limit = 20): Promise<AppNotification[]> {
  const { supabase, user } = await requireSession();
  const rows = check(
    await supabase
      .from("notifications")
      .select("id, title, body, url, scheduled_for, read_at")
      .eq("user_id", user.id)
      .lte("scheduled_for", new Date().toISOString())
      .in("status", ["sent", "expired", "failed"])
      .order("scheduled_for", { ascending: false })
      .limit(limit),
    "notificaciones"
  );
  return rows.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    url: n.url,
    scheduledFor: n.scheduled_for,
    readAt: n.read_at,
  }));
}
