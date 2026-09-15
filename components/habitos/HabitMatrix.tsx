"use client";

import * as React from "react";
import { Habit, HabitCategory } from "@/lib/types";
import { toggleHabitDay, addHabit } from "@/lib/api";
import { getDaysInMonth } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  Flame,
  Plus,
  Check,
  Calendar,
  Sparkles,
  Filter,
  Dumbbell,
  Brain,
  Briefcase,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HabitMatrixProps {
  initialHabits: Habit[];
}

const CATEGORY_MAP: Record<HabitCategory, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  mente: { label: "Mente", icon: Brain, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
  cuerpo: { label: "Cuerpo", icon: Dumbbell, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  trabajo: { label: "Trabajo", icon: Briefcase, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  espiritu: { label: "Espíritu", icon: Heart, color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
};

export function HabitMatrix({ initialHabits }: HabitMatrixProps) {
  const [habits, setHabits] = React.useState<Habit[]>(initialHabits);
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [pendingToggles, setPendingToggles] = React.useState<Set<string>>(new Set());

  // Form state
  const [newHabitName, setNewHabitName] = React.useState("");
  const [newHabitCat, setNewHabitCat] = React.useState<HabitCategory>("mente");
  const [newHabitTarget, setNewHabitTarget] = React.useState(25);

  // Valores dinámicos del mes actual
  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = getDaysInMonth();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const filteredHabits = habits.filter((h) =>
    selectedCategory === "all" ? true : h.category === selectedCategory
  );

  const handleToggleDay = async (habitId: string, day: number) => {
    const toggleKey = `${habitId}-${day}`;
    // No permitir doble-click mientras hay una petición en vuelo
    if (pendingToggles.has(toggleKey)) return;

    // --- Optimistic UI: actualizar el estado local INMEDIATAMENTE ---
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        const current = !!h.completedDays[day];
        return {
          ...h,
          completedDays: { ...h.completedDays, [day]: !current },
        };
      })
    );
    setPendingToggles((prev) => new Set(prev).add(toggleKey));

    try {
      const updated = await toggleHabitDay(habitId, day);
      setHabits(updated); // Sincronizar con la respuesta real del servidor
    } catch {
      // Revertir si falló
      setHabits((prev) =>
        prev.map((h) => {
          if (h.id !== habitId) return h;
          const current = !!h.completedDays[day];
          return {
            ...h,
            completedDays: { ...h.completedDays, [day]: !current },
          };
        })
      );
    } finally {
      setPendingToggles((prev) => {
        const next = new Set(prev);
        next.delete(toggleKey);
        return next;
      });
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const updated = await addHabit({
      name: newHabitName.trim(),
      category: newHabitCat,
      monthlyTargetDays: Number(newHabitTarget) || 20,
      color: "#10b981",
    });

    setHabits(updated);
    setNewHabitName("");
    setIsAddOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-1">
            <Calendar className="h-3.5 w-3.5" /> Matriz Mensual
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Panel de Hábitos
          </h1>
          <p className="text-sm text-zinc-400">
            Control de consistencia diaria. La excelencia es un hábito, no un acto.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category Filter Pills */}
          <div className="inline-flex rounded-lg bg-zinc-900/80 p-1 border border-zinc-800">
            <button
              onClick={() => setSelectedCategory("all")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer",
                selectedCategory === "all"
                  ? "bg-zinc-800 text-white font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              Todos
            </button>
            {(["cuerpo", "mente", "trabajo", "espiritu"] as HabitCategory[]).map(
              (cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-md transition-all capitalize cursor-pointer",
                    selectedCategory === cat
                      ? "bg-zinc-800 text-white font-semibold"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  {cat}
                </button>
              )
            )}
          </div>

          <Button
            onClick={() => setIsAddOpen(true)}
            variant="glow"
            size="sm"
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" /> Nuevo Hábito
          </Button>
        </div>
      </div>

      {/* Interactive Full-Width Matrix Card */}
      <Card className="border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl shadow-xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-900/50 text-zinc-400 text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 sticky left-0 z-20 bg-zinc-900 min-w-[240px]">
                    Hábito & Categoría
                  </th>
                  <th className="py-3 px-3 text-center min-w-[80px]">Racha</th>
                  {daysArray.map((d) => (
                    <th
                      key={d}
                      className={cn(
                        "py-2.5 px-1 text-center font-mono text-xs min-w-[32px]",
                        d === currentDay
                          ? "bg-emerald-500/10 text-emerald-400 font-bold border-x border-emerald-500/30"
                          : "text-zinc-400"
                      )}
                    >
                      <span>{d}</span>
                    </th>
                  ))}
                  <th className="py-3 px-4 text-right min-w-[90px]">Progreso</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800/60 text-sm">
                {filteredHabits.length === 0 ? (
                  <tr>
                    <td
                      colSpan={daysArray.length + 3}
                      className="py-16 text-center text-zinc-400"
                    >
                      <p className="text-sm font-semibold text-zinc-200">
                        No hay hábitos en tu catálogo todavía.
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        Cada gran cambio comienza con un hábito atómico.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsAddOpen(true)}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/20 transition-colors cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> Crear mi primer hábito
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredHabits.map((habit) => {
                  const catConfig = CATEGORY_MAP[habit.category] || CATEGORY_MAP.mente;
                  const completedCount = Object.values(habit.completedDays).filter(Boolean).length;
                  const percentage = Math.min(
                    100,
                    Math.round((completedCount / habit.monthlyTargetDays) * 100)
                  );

                  return (
                    <tr
                      key={habit.id}
                      className="hover:bg-zinc-900/40 transition-colors group"
                    >
                      {/* Habit Name & Category (Fixed Left Column) */}
                      <td className="py-3.5 px-4 sticky left-0 z-10 bg-zinc-950/95 backdrop-blur-md border-r border-zinc-800/60">
                        <div className="flex flex-col">
                          <span className="font-semibold text-zinc-100 group-hover:text-emerald-400 transition-colors">
                            {habit.name}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border",
                                catConfig.color
                              )}
                            >
                              <catConfig.icon className="h-3 w-3" />
                              {catConfig.label}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              Meta: {habit.monthlyTargetDays}d
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Streak Badge */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Flame className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                          {habit.streak}
                        </div>
                      </td>

                      {/* Day Checkboxes */}
                      {daysArray.map((day) => {
                        const isDone = !!habit.completedDays[day];
                        const isToday = day === currentDay;
                        const isFuture = day > currentDay;
                        const toggleKey = `${habit.id}-${day}`;
                        const isPending = pendingToggles.has(toggleKey);

                        return (
                          <td
                            key={day}
                            className={cn(
                              "p-1 text-center",
                              isToday && "bg-emerald-500/5 border-x border-emerald-500/20"
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => !isFuture && handleToggleDay(habit.id, day)}
                              disabled={isPending}
                              title={`Día ${day}: ${isDone ? "Completado" : isFuture ? "Futuro" : "Pendiente"}`}
                              className={cn(
                                "h-7 w-7 rounded-lg flex items-center justify-center transition-all duration-150 mx-auto select-none",
                                isPending && "opacity-50 cursor-wait",
                                !isPending && !isFuture && "cursor-pointer",
                                isFuture && "cursor-default opacity-30",
                                isDone
                                  ? "bg-emerald-500 text-zinc-950 font-bold shadow-sm shadow-emerald-500/30"
                                  : "bg-zinc-900 border border-zinc-800/90 text-transparent hover:border-zinc-600 hover:bg-zinc-800/80 active:scale-90"
                              )}
                            >
                              {isDone && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                            </button>
                          </td>
                        );
                      })}

                      {/* Monthly Progress % */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-mono text-xs font-bold text-zinc-200">
                            {percentage}%
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {completedCount}/{habit.monthlyTargetDays} d
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal / Dialog para crear nuevo hábito */}
      <Dialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        title="Crear Nuevo Hábito"
        description="Establece una rutina atómica que impulse tu visión a largo plazo."
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
              Nombre del Hábito
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Tomar 2.5L de agua, Caminata 30m..."
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                Categoría
              </label>
              <select
                value={newHabitCat}
                onChange={(e) => setNewHabitCat(e.target.value as HabitCategory)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              >
                <option value="mente">Mente</option>
                <option value="cuerpo">Cuerpo</option>
                <option value="trabajo">Trabajo</option>
                <option value="espiritu">Espíritu</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                Objetivo Días / Mes
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={newHabitTarget}
                onChange={(e) => setNewHabitTarget(Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="glow">
              Guardar Hábito
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
