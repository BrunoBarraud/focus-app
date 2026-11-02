"use client";

import * as React from "react";
import type { Goal, GoalCategory } from "@/lib/types";
import { formatTargetDate, isTempId, useGoals } from "@/components/objetivos/useGoals";
import { NewGoalForm } from "@/components/objetivos/NewGoalForm";
import { MilestoneEditor } from "@/components/objetivos/MilestoneEditor";
import { Target, User, Briefcase, Trash2, TrendingUp, Calendar } from "lucide-react";

interface FluidGoalsListProps {
  initialGoals: Goal[];
}

export function FluidGoalsList({ initialGoals }: FluidGoalsListProps) {
  const { goals, addGoal, toggleMilestone, addMilestone, deleteMilestone, deleteGoal } = useGoals(initialGoals);
  const [category, setCategory] = React.useState<GoalCategory>("personal");

  const filteredGoals = React.useMemo(() => goals.filter((g) => g.category === category), [goals, category]);

  return (
    <div className="w-full rounded-[22px] border border-white/[0.08] bg-zinc-900/60 backdrop-blur-xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] space-y-6">
      {/* Encabezado con selector Personal / Profesional */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.06] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Target className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Metas
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Escribí una meta y dividila en hitos para seguir el progreso.
          </p>
        </div>

        {/* Segmented Control */}
        <div className="flex items-center bg-zinc-950/80 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setCategory("personal")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              category === "personal"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <User className="h-3.5 w-3.5" /> Personales
          </button>
          <button
            type="button"
            onClick={() => setCategory("professional")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              category === "professional"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" /> Profesionales
          </button>
        </div>
      </div>

      <NewGoalForm category={category} onAdd={addGoal} />

      {/* Lista de Metas con transiciones fluidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredGoals.length === 0 ? (
          <div className="col-span-2 py-10 text-center text-xs text-zinc-500 bg-zinc-950/30 rounded-2xl border border-white/[0.04]">
            Todavía no tenés metas {category === "personal" ? "personales" : "profesionales"}. Escribí una arriba para empezar.
          </div>
        ) : (
          filteredGoals.map((goal) => {
            const isCompleted = goal.progress >= 100;

            return (
              <div
                key={goal.id}
                className={`group relative rounded-2xl bg-zinc-950/60 border transition-all duration-200 p-4 space-y-3 ${
                  isTempId(goal.id) ? "opacity-60 pointer-events-none " : ""
                }${
                  isCompleted
                    ? "border-emerald-500/30 bg-emerald-500/[0.02]"
                    : "border-white/[0.06] hover:border-violet-500/40"
                }`}
              >
                {/* Header de la tarjeta */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-300 border border-violet-500/20">
                        {goal.timeframe}
                      </span>
                      <span className="text-xs text-zinc-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatTargetDate(goal.targetDate)}
                      </span>
                    </div>

                    <h3
                      className={`text-xs sm:text-sm font-semibold truncate transition-all ${
                        isCompleted ? "line-through text-zinc-500" : "text-zinc-100"
                      }`}
                    >
                      {goal.title}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteGoal(goal.id)}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-zinc-500 hover:text-rose-400 transition-opacity rounded cursor-pointer"
                    aria-label={`Eliminar la meta ${goal.title}`}
                    title="Eliminar meta"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Barra de Progreso Fluida */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-zinc-400 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-violet-400" /> Progreso
                    </span>
                    <span
                      className={`font-bold ${
                        isCompleted ? "text-emerald-400" : "text-violet-300"
                      }`}
                    >
                      {Math.round(goal.progress)}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/[0.06]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted
                          ? "bg-emerald-400"
                          : "bg-gradient-to-r from-violet-500 to-indigo-400"
                      }`}
                      style={{ width: `${Math.min(100, goal.progress)}%` }}
                    />
                  </div>
                </div>

                <MilestoneEditor
                  goal={goal}
                  onToggle={toggleMilestone}
                  onAdd={addMilestone}
                  onDelete={deleteMilestone}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
