import { createClient } from "@/utils/supabase/client";
import {
  MorningRitual,
  Habit,
  PlannerTask,
  Goal,
  WheelArea,
  Dream,
  LifeExpectancyStats,
  WeekDay,
  HabitCategory,
} from "./types";
import { calculateMementoMori, calculateStreak, getDaysInMonth } from "./utils";

const DEFAULT_AREAS: WheelArea[] = [
  { subject: "Salud & Energía", score: 8, fullMark: 10, description: "Nutrición, fuerza, descanso y resistencia cardiovascular" },
  { subject: "Familia & Pareja", score: 8, fullMark: 10, description: "Vínculos de confianza, tiempo presente y calidad compartida" },
  { subject: "Carrera & Negocio", score: 7, fullMark: 10, description: "Impacto, liderazgo de proyectos y retos profesionales" },
  { subject: "Finanzas", score: 7, fullMark: 10, description: "Patrimonio neto, ahorro e inversiones diversificadas" },
  { subject: "Desarrollo Personal", score: 8, fullMark: 10, description: "Lectura, autocontrol, nuevas habilidades técnicas" },
  { subject: "Espiritualidad", score: 7, fullMark: 10, description: "Meditación, ecuanimidad y gratitud diaria" },
  { subject: "Ocio & Aventuras", score: 6, fullMark: 10, description: "Viajes, aficiones, naturaleza y tiempo no productivo" },
  { subject: "Entorno Físico", score: 8, fullMark: 10, description: "Espacio de trabajo minimalista y hogar ordenado" },
];

// Helper para obtener el usuario activo
async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// 1. Ritual Matutino (Supabase)
export async function getMorningRitual(): Promise<MorningRitual> {
  const { supabase, user } = await getCurrentUser();

  const formattedDate = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (!user) {
    return {
      date: formattedDate,
      mission: "Inicia sesión para definir tu misión de hoy.",
      pillar: "Enfoque & Autodisciplina",
      frog: "Crea tu cuenta o inicia sesión para registrar tus sapos.",
      energyLevel: "high",
      quote: {
        text: "No es que tengamos poco tiempo, sino que perdemos mucho.",
        author: "Séneca",
      },
      completed: false,
    };
  }

  const { data } = await supabase
    .from("user_settings")
    .select("daily_mission, daily_pillar, daily_frog, energy_level")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    date: formattedDate,
    mission: data?.daily_mission || "Define la misión prioritaria para este día.",
    pillar: data?.daily_pillar || "Claridad & Presencia",
    frog: data?.daily_frog || "Elige el sapo más importante del día.",
    energyLevel: (data?.energy_level as any) || "high",
    quote: {
      text: "No es que tengamos poco tiempo, sino que perdemos mucho.",
      author: "Séneca",
    },
    completed: false,
  };
}

export async function updateMorningRitual(
  updates: Partial<MorningRitual>
): Promise<MorningRitual> {
  const { supabase, user } = await getCurrentUser();

  if (user) {
    await supabase.from("user_settings").upsert({
      user_id: user.id,
      daily_mission: updates.mission,
      daily_pillar: updates.pillar,
      daily_frog: updates.frog,
      energy_level: updates.energyLevel,
      updated_at: new Date().toISOString(),
    });
  }

  return getMorningRitual();
}

// 2. Memento Mori (Supabase)
export async function getLifeExpectancyStats(): Promise<LifeExpectancyStats> {
  const { supabase, user } = await getCurrentUser();

  if (!user) {
    return calculateMementoMori("1995-01-01", 80);
  }

  const { data } = await supabase
    .from("user_settings")
    .select("birth_date, target_age")
    .eq("user_id", user.id)
    .maybeSingle();

  const birthDate = data?.birth_date || user.user_metadata?.birth_date || "1995-01-01";
  const targetAge = data?.target_age || 80;

  return calculateMementoMori(birthDate, targetAge);
}

// 3. Hábitos (Supabase)
export async function getHabits(): Promise<Habit[]> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return [];

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  // Filtrar logs solo del mes actual
  const monthStart = `${year}-${month}-01`;
  const daysThisMonth = getDaysInMonth();
  const monthEnd = `${year}-${month}-${String(daysThisMonth).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("habits")
    .select(`
      id,
      title,
      category,
      monthly_target_days,
      color,
      habit_logs (
        date,
        completed
      )
    `)
    .eq("user_id", user.id);

  if (error || !data) return [];

  return data.map((h: any) => {
    const completedMap: Record<number, boolean> = {};

    if (Array.isArray(h.habit_logs)) {
      h.habit_logs.forEach((log: { date: string; completed: boolean }) => {
        // Solo incluir logs del mes actual
        if (log.date >= monthStart && log.date <= monthEnd && log.completed) {
          const parts = log.date.split("-");
          const dayNum = parseInt(parts[2], 10);
          if (dayNum) {
            completedMap[dayNum] = true;
          }
        }
      });
    }

    const realStreak = calculateStreak(completedMap);
    const completedCount = Object.values(completedMap).filter(Boolean).length;

    return {
      id: h.id,
      name: h.title,
      category: (h.category as HabitCategory) || "mente",
      streak: realStreak,
      bestStreak: Math.max(realStreak, completedCount),
      monthlyTargetDays: h.monthly_target_days || 25,
      color: h.color || "#10b981",
      completedDays: completedMap,
    };
  });
}

export async function toggleHabitDay(habitId: string, day: number): Promise<Habit[]> {
  const { supabase } = await getCurrentUser();

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const dayStr = String(day).padStart(2, "0");
  const dateStr = `${year}-${month}-${dayStr}`;

  // Verificar si ya existe registro en Supabase
  const { data: existing } = await supabase
    .from("habit_logs")
    .select("id, completed")
    .eq("habit_id", habitId)
    .eq("date", dateStr)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("habit_logs")
      .update({ completed: !existing.completed })
      .eq("id", existing.id);
  } else {
    await supabase.from("habit_logs").insert({
      habit_id: habitId,
      date: dateStr,
      completed: true,
    });
  }

  return getHabits();
}

export async function addHabit(
  habit: Omit<Habit, "id" | "streak" | "bestStreak" | "completedDays">
): Promise<Habit[]> {
  const { supabase, user } = await getCurrentUser();
  if (!user) throw new Error("Debes iniciar sesión");

  await supabase.from("habits").insert({
    user_id: user.id,
    title: habit.name,
    category: habit.category,
    monthly_target_days: habit.monthlyTargetDays,
    color: habit.color || "#10b981",
  });

  return getHabits();
}

// 4. Planificador Semanal (Supabase) — filtra por semana actual
export async function getWeeklyTasks(): Promise<PlannerTask[]> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((t: any) => ({
    id: t.id,
    title: t.title,
    description: t.description || "",
    day: (t.day_of_week as WeekDay) || "L",
    priority: (t.priority as any) || "medium",
    estimatedMinutes: t.estimated_minutes || 30,
    completed: t.status === "completed",
    tag: t.tag || "General",
  }));
}

export async function toggleTaskCompletion(taskId: string): Promise<PlannerTask[]> {
  const { supabase } = await getCurrentUser();

  const { data: task } = await supabase
    .from("tasks")
    .select("status")
    .eq("id", taskId)
    .single();

  if (task) {
    const nextStatus = task.status === "completed" ? "pending" : "completed";
    await supabase.from("tasks").update({ status: nextStatus }).eq("id", taskId);
  }

  return getWeeklyTasks();
}

export async function addTask(
  task: Omit<PlannerTask, "id">
): Promise<PlannerTask[]> {
  const { supabase, user } = await getCurrentUser();
  if (!user) throw new Error("Debes iniciar sesión");

  await supabase.from("tasks").insert({
    user_id: user.id,
    title: task.title,
    description: task.description,
    day_of_week: task.day,
    priority: task.priority,
    estimated_minutes: task.estimatedMinutes,
    status: task.completed ? "completed" : "pending",
    tag: task.tag,
  });

  return getWeeklyTasks();
}

export async function deleteTask(taskId: string): Promise<PlannerTask[]> {
  const { supabase } = await getCurrentUser();
  await supabase.from("tasks").delete().eq("id", taskId);
  return getWeeklyTasks();
}

// 5. Objetivos y Metas (Supabase)
export async function getGoals(): Promise<Goal[]> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return [];

  const { data } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .in("type", ["personal", "profesional"]);

  if (!data) return [];

  return data.map((g: any) => ({
    id: g.id,
    title: g.title,
    category: g.type === "profesional" ? "professional" : "personal",
    progress: Number(g.progress) || 0,
    targetDate: g.target_date || "Fin de año",
    timeframe: (g.timeframe as any) || "Anual",
    milestones: [
      { id: `${g.id}-1`, title: "Definir plan estratégico", completed: Number(g.progress) > 30 },
      { id: `${g.id}-2`, title: "Ejecutar fase intermedia", completed: Number(g.progress) > 70 },
      { id: `${g.id}-3`, title: "Consolidación final", completed: Number(g.progress) === 100 },
    ],
  }));
}

export async function toggleMilestone(
  goalId: string,
  milestoneId: string
): Promise<Goal[]> {
  const { supabase } = await getCurrentUser();

  const { data: goal } = await supabase
    .from("goals")
    .select("progress")
    .eq("id", goalId)
    .single();

  if (goal) {
    const nextProgress = goal.progress >= 100 ? 50 : Math.min(100, goal.progress + 25);
    await supabase
      .from("goals")
      .update({ progress: nextProgress })
      .eq("id", goalId);
  }

  return getGoals();
}

// 6. Rueda de la Vida (Supabase)
export async function getWheelOfLife(): Promise<WheelArea[]> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return DEFAULT_AREAS;

  const { data } = await supabase
    .from("goals")
    .select("title, score, description")
    .eq("user_id", user.id)
    .eq("type", "rueda");

  if (!data || data.length === 0) {
    // Si el usuario aún no tiene áreas guardadas, las inicializamos en Supabase
    const toInsert = DEFAULT_AREAS.map((a) => ({
      user_id: user.id,
      type: "rueda",
      title: a.subject,
      description: a.description,
      score: a.score,
    }));
    await supabase.from("goals").insert(toInsert);
    return DEFAULT_AREAS;
  }

  return data.map((d: any) => ({
    subject: d.title,
    score: Number(d.score) || 7,
    fullMark: 10,
    description: d.description || "",
  }));
}

export async function updateWheelAreaScore(
  subject: string,
  newScore: number
): Promise<WheelArea[]> {
  const { supabase, user } = await getCurrentUser();
  if (user) {
    await supabase
      .from("goals")
      .update({ score: newScore })
      .eq("user_id", user.id)
      .eq("type", "rueda")
      .eq("title", subject);
  }
  return getWheelOfLife();
}

// 7. Lista de Sueños (Supabase)
export async function getDreams(): Promise<Dream[]> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return [];

  const { data } = await supabase
    .from("dreams")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (!data) return [];

  return data.map((d: any) => ({
    id: d.id,
    title: d.title,
    description: d.description || "",
    category: (d.category as any) || "Experiencias",
    status: (d.status as any) || "pending",
    targetYear: d.target_year || 2028,
  }));
}

export async function toggleDreamStatus(
  dreamId: string,
  status: Dream["status"]
): Promise<Dream[]> {
  const { supabase } = await getCurrentUser();
  await supabase.from("dreams").update({ status }).eq("id", dreamId);
  return getDreams();
}

export async function addDream(dream: Omit<Dream, "id">): Promise<Dream[]> {
  const { supabase, user } = await getCurrentUser();
  if (!user) throw new Error("Debes iniciar sesión");

  await supabase.from("dreams").insert({
    user_id: user.id,
    title: dream.title,
    description: dream.description,
    category: dream.category,
    status: dream.status,
    target_year: dream.targetYear,
  });

  return getDreams();
}
