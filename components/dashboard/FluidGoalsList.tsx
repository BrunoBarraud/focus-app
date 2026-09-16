"use client";

import * as React from "react";
import { Goal, GoalCategory } from "@/lib/types";
import { addGoalAction, deleteGoalAction, toggleMilestoneAction } from "@/app/actions";
import {
  Target,
  User,
  Briefcase,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Sparkles,
  TrendingUp,
  Calendar,
} from "lucide-react";

interface FluidGoalsListProps {
  initialGoals: Goal[];
}

export function FluidGoalsList({ initialGoals }: FluidGoalsListProps) {
  const [goals, setGoals] = React.useState<Goal[]>(initialGoals);
  const [category, setCategory] = React.useState<GoalCategory>("personal");
  const [newTitle, setNewTitle] = React.useState("");
  const [newTimeframe, setNewTimeframe] = React.useState<"Q1" | "Q2" | "Q3" | "Q4" | "Anual">("Q3");

  // Sincronizar estado cuando el Server Component revalida y envía datos frescos
  React.useEffect(() => {
    setGoals(initialGoals);
  }, [initialGoals]);

  const filteredGoals = React.useMemo(() => {
    return goals.filter((g) => g.category === category);
  }, [goals, category]);

  // Agregar meta rápida inline con Server Action
  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const previousGoals = goals;
    const titleToSave = newTitle.trim();
    const tempId = "temp-" + Date.now();
    const tempGoal: Goal = {
      id: tempId,
      title: titleToSave,
      category,
      progress: 0,
      targetDate: "Fin de año",
      timeframe: newTimeframe,
      milestones: [
        { id: "m1", title: "Fase 1: Planificación", completed: false },
        { id: "m2", title: "Fase 2: Ejecución", completed: false },
      ],
    };

    setGoals((prev) => [tempGoal, ...prev]);
    setNewTitle("");

    try {
      const res = await addGoalAction({
        title: tempGoal.title,
        category: tempGoal.category,
        progress: tempGoal.progress,
        targetDate: tempGoal.targetDate,
        timeframe: tempGoal.timeframe,
      });

      if (res?.error) {
        console.error("Error al agregar meta en Supabase:", res.error);
        setGoals(previousGoals);
      } else if (res?.goal) {
        setGoals((prev) =>
          prev.map((g) => (g.id === tempId ? { ...g, id: res.goal.id } : g))
        );
      }
    } catch (err) {
      console.error("Error al agregar meta:", err);
      setGoals(previousGoals);
    }
  };

  // Alternar progreso o hito de la meta con Server Action y rollback
  const handleToggleMilestone = async (goalId: string, milestoneId: string) => {
    const previousGoals = goals;

    // Optimistic progress bump
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const newProgress = g.progress >= 100 ? 50 : Math.min(100, g.progress + 25);
        return {
          ...g,
          progress: newProgress,
          milestones: g.milestones.map((m) =>
            m.id === milestoneId ? { ...m, completed: !m.completed } : m
          ),
        };
      })
    );

    try {
      const res = await toggleMilestoneAction(goalId, milestoneId);
      if (res?.error) {
        console.error("Error al actualizar hito:", res.error);
        setGoals(previousGoals);
      }
    } catch (err) {
      console.error("Error al actualizar hito:", err);
      setGoals(previousGoals);
    }
  };

  // Eliminar meta con Server Action y rollback
  const handleDeleteGoal = async (goalId: string) => {
    const previousGoals = goals;
    setGoals((prev) => prev.filter((g) => g.id !== goalId));

    try {
      const res = await deleteGoalAction(goalId);
      if (res?.error) {
        console.error("Error al eliminar meta en Supabase:", res.error);
        setGoals(previousGoals);
      }
    } catch (err) {
      console.error("Error al eliminar meta:", err);
      setGoals(previousGoals);
    }
  };

  return (
    <div className="w-full rounded-[22px] border border-white/[0.08] bg-zinc-900/60 backdrop-blur-xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] space-y-6">
      {/* Header con Tabs estilo Segmented Control de Apple */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.06] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Target className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Objetivos & Metas Estratégicas
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Alta fluidez sin modales: agrega metas directamente presionando Enter.
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

      {/* Input Rápido Inline para agregar metas sin modales */}
      <form onSubmit={handleAddGoal} className="flex items-center gap-2">
        <input
          type="text"
          placeholder={`+ Nueva meta ${category === "personal" ? "personal" : "profesional"}... presiona Enter`}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="flex-1 bg-zinc-950/60 border border-zinc-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
        />

        <select
          value={newTimeframe}
          onChange={(e) => setNewTimeframe(e.target.value as any)}
          className="bg-zinc-950/60 border border-zinc-700/80 rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-violet-500"
        >
          <option value="Q3">Q3</option>
          <option value="Q4">Q4</option>
          <option value="Anual">Anual</option>
        </select>

        <button
          type="submit"
          className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shrink-0 flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Agregar</span>
        </button>
      </form>

      {/* Lista de Metas con transiciones fluidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredGoals.length === 0 ? (
          <div className="col-span-2 py-10 text-center text-xs text-zinc-500 bg-zinc-950/30 rounded-2xl border border-white/[0.04]">
            No tienes metas {category === "personal" ? "personales" : "profesionales"} registradas. Escribe en el campo de arriba para añadir una.
          </div>
        ) : (
          filteredGoals.map((goal) => {
            const isCompleted = goal.progress >= 100;

            return (
              <div
                key={goal.id}
                className={`group relative rounded-2xl bg-zinc-950/60 border transition-all duration-200 p-4 space-y-3 ${
                  isCompleted
                    ? "border-emerald-500/30 bg-emerald-500/[0.02]"
                    : "border-white/[0.06] hover:border-violet-500/40"
                }`}
              >
                {/* Header de la tarjeta */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-300 border border-violet-500/20">
                        {goal.timeframe}
                      </span>
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {goal.targetDate}
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
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-rose-400 transition-opacity rounded"
                    title="Eliminar meta"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Barra de Progreso Fluida */}
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
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

                {/* Hitos / Milestones interactivos */}
                <div className="space-y-1.5 pt-1">
                  {goal.milestones.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleToggleMilestone(goal.id, m.id)}
                      className="w-full text-left flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer"
                    >
                      {m.completed ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                      )}
                      <span
                        className={`text-xs truncate ${
                          m.completed ? "line-through text-zinc-500" : "text-zinc-300"
                        }`}
                      >
                        {m.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
