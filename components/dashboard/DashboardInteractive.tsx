"use client";

import * as React from "react";
import type { Habit, Goal, MorningRitual, PlannerData } from "@/lib/types";
import { HabitTrackerMatrix } from "./HabitTrackerMatrix";
import { WeeklyMonthlyPlanner } from "./WeeklyMonthlyPlanner";
import { EditablePomodoro } from "./EditablePomodoro";
import { InlineMorningRitual } from "./InlineMorningRitual";
import { FluidGoalsList } from "./FluidGoalsList";
import { PushNotificationButton } from "./PushNotificationButton";
import { Sparkles } from "lucide-react";
import { useClientValue } from "@/lib/client-hooks";

function greetingFor(hour: number) {
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

interface DashboardInteractiveProps {
  initialHabits: Habit[];
  initialPlanner: PlannerData;
  initialGoals: Goal[];
  initialRitual: MorningRitual;
  userName: string;
}

export function DashboardInteractive({
  initialHabits,
  initialPlanner,
  initialGoals,
  initialRitual,
  userName,
}: DashboardInteractiveProps) {
  // Saludo según la hora LOCAL del usuario (el servidor corre en UTC).
  const greeting = useClientValue(() => greetingFor(new Date().getHours()), "Hola");

  return (
    <div className="space-y-6 sm:space-y-8 pb-16 animate-in fade-in duration-300">
      {/* 1. Header con estilo Apple HIG */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 sm:p-6 rounded-[22px] border border-white/[0.08] bg-zinc-900/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Productividad Consciente
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
            {greeting}, {userName}.
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
            Todas tus herramientas centralizadas en una sola pantalla interactiva.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <PushNotificationButton />
        </div>
      </div>

      {/* FILA 1 (Top - Mayor prioridad): Planificador Inteligente (más ancho), Focus Mode (alto y con presencia) y Priorities */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Planificador Inteligente: Widget principal y más ancho (7 de 12 columnas) */}
        <div className="lg:col-span-7 flex flex-col h-full">
          <WeeklyMonthlyPlanner initialData={initialPlanner} />
        </div>

        {/* Columna lateral (5 de 12 columnas): Focus Mode de gran altura + Priorities */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <EditablePomodoro />
          <InlineMorningRitual initialData={initialRitual} />
        </div>
      </section>

      {/* FILA 2 (Medio): Matriz de Hábitos & Consistencia (Ocupando todo el ancho disponible) */}
      <section aria-labelledby="habitos-matrix-heading" className="w-full">
        <HabitTrackerMatrix initialHabits={initialHabits} />
      </section>

      {/* FILA 3 (Abajo): Objetivos & Metas Estratégicas (Al fondo de la página) */}
      <section aria-labelledby="objetivos-heading" className="w-full">
        <FluidGoalsList initialGoals={initialGoals} />
      </section>
    </div>
  );
}
