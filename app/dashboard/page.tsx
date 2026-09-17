import * as React from "react";
import { createClient } from "@/utils/supabase/server";
import { DashboardInteractive } from "@/components/dashboard/DashboardInteractive";
import { Habit, PlannerTask, Goal, MorningRitual, HabitCategory, WeekDay } from "@/lib/types";
import { calculateStreak, getDaysInMonth } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  let habitsData: Habit[] = [
    {
      id: "h-1",
      name: "Ejercicios en Casa",
      category: "cuerpo",
      streak: 5,
      bestStreak: 12,
      monthlyTargetDays: 15,
      color: "#10b981",
      completedDays: { 1: true, 2: true, 3: true, 14: true, 15: true, 16: true },
    },
    {
      id: "h-2",
      name: "Deep Work (2h sin distracciones)",
      category: "trabajo",
      streak: 8,
      bestStreak: 14,
      monthlyTargetDays: 22,
      color: "#3b82f6",
      completedDays: { 1: true, 2: true, 3: true, 7: true, 8: true, 9: true, 14: true, 15: true, 16: true },
    },
    {
      id: "h-3",
      name: "Lectura de No Ficción (20m)",
      category: "mente",
      streak: 3,
      bestStreak: 18,
      monthlyTargetDays: 25,
      color: "#8b5cf6",
      completedDays: { 14: true, 15: true, 16: true },
    },
    {
      id: "h-4",
      name: "Meditación & Gratitud",
      category: "espiritu",
      streak: 12,
      bestStreak: 20,
      monthlyTargetDays: 20,
      color: "#f59e0b",
      completedDays: { 1: true, 2: true, 5: true, 6: true, 12: true, 13: true, 14: true, 15: true, 16: true },
    },
  ];

  let tasksData: PlannerTask[] = [
    {
      id: "t-1",
      title: "Revisión estratégica de objetivos del trimestre",
      day: "X",
      priority: "high",
      estimatedMinutes: 45,
      completed: false,
      tag: "Estrategia",
    },
    {
      id: "t-2",
      title: "Bloque de código y refactorización UI",
      day: "X",
      priority: "high",
      estimatedMinutes: 60,
      completed: true,
      tag: "Desarrollo",
    },
    {
      id: "t-3",
      title: "Planificación semanal de sprint y métricas",
      day: "L",
      priority: "medium",
      estimatedMinutes: 30,
      completed: true,
      tag: "Organización",
    },
    {
      id: "t-4",
      title: "Caminata de desconexión sin pantalla",
      day: "X",
      priority: "low",
      estimatedMinutes: 30,
      completed: false,
      tag: "Salud",
    },
  ];

  let goalsData: Goal[] = [
    {
      id: "g-1",
      title: "Dominar desarrollo fullstack con Next.js y Supabase",
      category: "professional",
      progress: 75,
      targetDate: "30 Nov",
      timeframe: "Q3",
      milestones: [
        { id: "m-1", title: "Completar arquitectura y esquemas RLS", completed: true },
        { id: "m-2", title: "Diseño Apple HIG y microinteracciones", completed: true },
        { id: "m-3", title: "Pruebas de estrés y despliegue final", completed: false },
      ],
    },
    {
      id: "g-2",
      title: "Entrenamiento de fuerza 4 veces por semana",
      category: "personal",
      progress: 60,
      targetDate: "Fin de año",
      timeframe: "Anual",
      milestones: [
        { id: "m-4", title: "Rutina estructurada de empuje/tracción/pierna", completed: true },
        { id: "m-5", title: "Alcanzar 15 días consecutivos de registro", completed: false },
      ],
    },
  ];

  let ritualData: MorningRitual = {
    date: new Date().toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    mission: "Construir sistemas consistentes de enfoque y autocontrol con disciplina.",
    pillar: "Presencia, Claridad & Autodisciplina",
    frog: "Terminar la refactorización integral del dashboard principal.",
    energyLevel: "high",
    quote: {
      text: "No es que tengamos poco tiempo, sino que perdemos mucho.",
      author: "Séneca",
    },
    completed: false,
  };

  let userEmail: string | null = null;
  let userName: string = "Invitado";

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      userEmail = user.email || null;
      userName = user.user_metadata?.first_name || 
                 user.user_metadata?.full_name?.split(" ")[0] || 
                 user.email?.split("@")[0] || 
                 "Usuario";

      // Limpiar datos de prueba si hay un usuario autenticado
      habitsData = [];
      tasksData = [];
      goalsData = [];

      // 1. Settings / Ritual
      const { data: settings } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (settings?.daily_mission) ritualData.mission = settings.daily_mission;
      if (settings?.daily_pillar) ritualData.pillar = settings.daily_pillar;
      if (settings?.daily_frog) ritualData.frog = settings.daily_frog;
      if (settings?.energy_level) ritualData.energyLevel = settings.energy_level as any;

      // 2. Hábitos
      const { data: userHabits } = await supabase
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

      if (userHabits) {
        const now = new Date();
        const year = now.getFullYear();
        const monthStr = String(now.getMonth() + 1).padStart(2, "0");
        const monthStart = `${year}-${monthStr}-01`;
        const daysThisMonth = getDaysInMonth();
        const monthEnd = `${year}-${monthStr}-${String(daysThisMonth).padStart(2, "0")}`;

        habitsData = userHabits.map((h: any) => {
          const completedMap: Record<number, boolean> = {};

          if (Array.isArray(h.habit_logs)) {
            h.habit_logs.forEach((log: { date: string; completed: boolean }) => {
              if (log.date >= monthStart && log.date <= monthEnd && log.completed) {
                const parts = log.date.split("-");
                const dayNum = parseInt(parts[2], 10);
                if (dayNum) completedMap[dayNum] = true;
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

      // 3. Tareas
      const { data: userTasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (userTasks) {
        tasksData = userTasks.map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description || "",
          day: (t.day_of_week as WeekDay) || "X",
          scheduledDate: t.scheduled_date || undefined,
          priority: (t.priority as any) || "medium",
          estimatedMinutes: t.estimated_minutes || 30,
          completed: t.status === "completed",
          tag: t.tag || "General",
        }));
      }

      // 4. Objetivos
      const { data: userGoals } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .in("type", ["personal", "profesional"]);

      if (userGoals) {
        goalsData = userGoals.map((g: any) => ({
          id: g.id,
          title: g.title,
          category: g.type === "profesional" ? "professional" : "personal",
          progress: Number(g.progress) || 0,
          targetDate: g.target_date || "Fin de año",
          timeframe: (g.timeframe as any) || "Anual",
          milestones: [
            { id: `${g.id}-1`, title: "Fase 1: Planificación", completed: Number(g.progress) > 30 },
            { id: `${g.id}-2`, title: "Fase 2: Ejecución", completed: Number(g.progress) > 70 },
          ],
        }));
      }
    }
  } catch (error) {
    console.warn("Aviso al consultar Supabase en HomePage:", error);
  }

  return (
    <DashboardInteractive
      initialHabits={habitsData}
      initialTasks={tasksData}
      initialGoals={goalsData}
      initialRitual={ritualData}
      userName={userName}
      userEmail={userEmail}
    />
  );
}
