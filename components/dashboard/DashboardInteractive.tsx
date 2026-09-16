"use client";

import * as React from "react";
import { Habit, PlannerTask, Goal, MorningRitual } from "@/lib/types";
import { HabitTrackerMatrix } from "./HabitTrackerMatrix";
import { WeeklyMonthlyPlanner } from "./WeeklyMonthlyPlanner";
import { EditablePomodoro } from "./EditablePomodoro";
import { InlineMorningRitual } from "./InlineMorningRitual";
import { FluidGoalsList } from "./FluidGoalsList";
import { Sparkles, ArrowRight, UserCheck, ShieldCheck, Flame, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface DashboardInteractiveProps {
  initialHabits: Habit[];
  initialTasks: PlannerTask[];
  initialGoals: Goal[];
  initialRitual: MorningRitual;
  userName: string;
  userEmail: string | null;
}

export function DashboardInteractive({
  initialHabits,
  initialTasks,
  initialGoals,
  initialRitual,
  userName,
  userEmail,
}: DashboardInteractiveProps) {
  // Saludo dinámico según la hora
  const [greeting, setGreeting] = React.useState("Buenos días");

  React.useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Buenos días");
    else if (hour < 20) setGreeting("Buenas tardes");
    else setGreeting("Buenas noches");
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8 pb-16 animate-in fade-in duration-300">
      {/* 1. Header con estilo Apple HIG */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 sm:p-6 rounded-[22px] border border-white/[0.08] bg-zinc-900/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Productividad Consciente • Apple HIG
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
            {greeting}, {userName}.
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
            {userEmail
              ? "Todas tus herramientas centralizadas en una sola pantalla interactiva."
              : "Inicia sesión para sincronizar automáticamente tus hábitos y metas en Supabase."}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {!userEmail ? (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-zinc-200 bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 rounded-xl transition-all shadow-sm"
            >
              <UserCheck className="h-4 w-4 text-emerald-400" />
              Iniciar Sesión
            </Link>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
              <ShieldCheck className="h-4 w-4" />
              <span>Sincronizado</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Módulo de Hábitos (Diseño Estricto: Columna fija + Timeline scrollable + Checkmarks verdes) */}
      <section aria-labelledby="habitos-matrix-heading">
        <HabitTrackerMatrix initialHabits={initialHabits} />
      </section>

      {/* 3. Grid de 2 Columnas para Organizador Semanal y Enfoque / Ritual */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Organizador Semanal y Mensual (7 columnas en desktop) */}
        <div className="lg:col-span-7">
          <WeeklyMonthlyPlanner initialTasks={initialTasks} />
        </div>

        {/* Focus Mode Pomodoro + Ritual Matutino (5 columnas en desktop) */}
        <div className="lg:col-span-5 space-y-6">
          <EditablePomodoro />
          <InlineMorningRitual initialData={initialRitual} />
        </div>
      </section>

      {/* 4. Objetivos y Metas de Alta Fluidez */}
      <section aria-labelledby="objetivos-heading">
        <FluidGoalsList initialGoals={initialGoals} />
      </section>
    </div>
  );
}
