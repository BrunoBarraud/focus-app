import * as React from "react";
import { createClient } from "@/utils/supabase/server";
import { MorningRitual } from "@/components/dashboard/MorningRitual";
import { StatsOverview } from "@/components/dashboard/StatsOverview";
import { MementoMori } from "@/components/dashboard/MementoMori";
import { calculateMementoMori, calculateStreak, getDaysInMonth } from "@/lib/utils";
import { Sparkles, ArrowRight, UserCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Habit, MorningRitual as MorningRitualType, LifeExpectancyStats, HabitCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let lifeStats: LifeExpectancyStats = calculateMementoMori("1995-01-01", 80);
  let ritualData: MorningRitualType = {
    date: new Date().toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    mission: "Define tu misión principal de hoy.",
    pillar: "Disciplina & Claridad",
    frog: "Identifica el sapo más importante del día.",
    energyLevel: "high",
    quote: {
      text: "No es que tengamos poco tiempo, sino que perdemos mucho.",
      author: "Séneca",
    },
    completed: false,
  };
  let habitsData: Habit[] = [];
  let userEmail: string | null = null;
  let userName: string = "Invitado";

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      userEmail = user.email || null;
      userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuario";

      // 1. Fetch de user_settings para calcular Memento Mori y Ritual
      const { data: settings } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      const birthDate = settings?.birth_date || user.user_metadata?.birth_date || "1995-01-01";
      const targetAge = settings?.target_age || 80;
      lifeStats = calculateMementoMori(birthDate, targetAge);

      if (settings?.daily_mission) {
        ritualData.mission = settings.daily_mission;
      }
      if (settings?.daily_pillar) {
        ritualData.pillar = settings.daily_pillar;
      }
      if (settings?.daily_frog) {
        ritualData.frog = settings.daily_frog;
      }
      if (settings?.energy_level) {
        ritualData.energyLevel = settings.energy_level as any;
      }

      // 2. Fetch de hábitos y logs del usuario autenticado
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

      if (userHabits && userHabits.length > 0) {
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
              // Solo logs del mes actual
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
    }
  } catch (error) {
    console.warn("Aviso al consultar Supabase en HomePage:", error);
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-1">
            <Sparkles className="h-3.5 w-3.5" /> Estado Mental Óptimo
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Buenos días, {userName}.
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            {userEmail
              ? "Cada acción de hoy es un voto por la persona que estás construyendo."
              : "Inicia sesión para que tus hábitos y metas se guarden exclusivamente en tu cuenta."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!userEmail && (
            <Link href="/login">
              <Button variant="outline" size="sm" className="gap-2">
                <UserCheck className="h-4 w-4 text-emerald-400" />
                Iniciar Sesión
              </Button>
            </Link>
          )}

          <Link href="/enfoque">
            <Button variant="glow" size="sm" className="gap-2">
              Iniciar Bloque de Enfoque
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* 1. Memento Mori dinámico desde Supabase */}
      <section aria-labelledby="memento-mori-heading">
        <MementoMori stats={lifeStats} />
      </section>

      {/* 2. Ritual Matutino */}
      <section aria-labelledby="ritual-matutino-heading">
        <MorningRitual initialData={ritualData} />
      </section>

      {/* 3. Estadísticas y Rachas de Hábitos reales */}
      <section aria-labelledby="estadisticas-heading">
        <StatsOverview habits={habitsData} />
      </section>
    </div>
  );
}
