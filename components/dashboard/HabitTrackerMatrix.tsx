"use client";

import * as React from "react";
import { Habit, HabitCategory } from "@/lib/types";
import { toggleHabitDay, updateHabitTitle, addHabit, deleteHabit } from "@/lib/api";
import { getDaysInMonth, calculateStreak } from "@/lib/utils";
import { Flame, Plus, Check, Edit2, Trash2 } from "lucide-react";

interface HabitTrackerMatrixProps {
  initialHabits: Habit[];
}

const CATEGORY_COLORS: Record<HabitCategory, { label: string; bg: string; text: string; border: string }> = {
  cuerpo: { label: "Cuerpo", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  mente: { label: "Mente", bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20" },
  trabajo: { label: "Trabajo", bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  espiritu: { label: "Espíritu", bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
};

export function HabitTrackerMatrix({ initialHabits }: HabitTrackerMatrixProps) {
  const [habits, setHabits] = React.useState<Habit[]>(initialHabits);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState<string>("");
  const [isAdding, setIsAdding] = React.useState(false);
  const [newHabitName, setNewHabitName] = React.useState("");
  const [newHabitCat, setNewHabitCat] = React.useState<HabitCategory>("cuerpo");
  const [newHabitTarget, setNewHabitTarget] = React.useState(20);

  // Días del mes y día actual
  const daysInMonth = getDaysInMonth();
  const daysArray = React.useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth]
  );
  const currentDay = new Date().getDate(); // 16

  // Sincronizar estado inicial
  React.useEffect(() => {
    setHabits(initialHabits);
  }, [initialHabits]);

  // Toggle de un día con UI optimista
  const handleToggle = async (habitId: string, day: number) => {
    // Optimistic update
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        const newCompleted = { ...h.completedDays, [day]: !h.completedDays[day] };
        const newStreak = calculateStreak(newCompleted);
        const completedCount = Object.values(newCompleted).filter(Boolean).length;
        return {
          ...h,
          completedDays: newCompleted,
          streak: newStreak,
          bestStreak: Math.max(h.bestStreak, completedCount),
        };
      })
    );

    try {
      await toggleHabitDay(habitId, day);
    } catch (err) {
      console.error("Error al registrar hábito:", err);
    }
  };

  // Comenzar edición de título
  const startEditing = (habit: Habit) => {
    setEditingId(habit.id);
    setEditTitle(habit.name);
  };

  // Guardar edición de título
  const saveTitle = async (habitId: string) => {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    const titleToSave = editTitle.trim();
    setEditingId(null);

    // Optimistic
    setHabits((prev) =>
      prev.map((h) => (h.id === habitId ? { ...h, name: titleToSave } : h))
    );

    try {
      await updateHabitTitle(habitId, titleToSave);
    } catch (err) {
      console.error("Error al actualizar título del hábito:", err);
    }
  };

  // Crear nuevo hábito inline
  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const tempHabit: Habit = {
      id: "temp-" + Date.now(),
      name: newHabitName.trim(),
      category: newHabitCat,
      monthlyTargetDays: newHabitTarget,
      streak: 0,
      bestStreak: 0,
      color: "#10b981",
      completedDays: {},
    };

    setHabits((prev) => [...prev, tempHabit]);
    setNewHabitName("");
    setIsAdding(false);

    try {
      const updated = await addHabit({
        name: tempHabit.name,
        category: tempHabit.category,
        monthlyTargetDays: tempHabit.monthlyTargetDays,
        color: tempHabit.color,
      });
      setHabits(updated);
    } catch (err) {
      console.error("Error al agregar hábito:", err);
    }
  };

  // Eliminar hábito
  const handleDeleteHabit = async (habitId: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
    try {
      await deleteHabit(habitId);
    } catch (err) {
      console.error("Error al eliminar hábito:", err);
    }
  };

  return (
    <div className="w-full rounded-[22px] border border-white/[0.08] bg-zinc-900/60 backdrop-blur-xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
      {/* Header con título y botón de agregar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Matriz de Hábitos & Consistencia
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Registro diario con línea de tiempo y racha en tiempo real.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-200 bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 rounded-xl transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          {isAdding ? "Cancelar" : "Nuevo Hábito"}
        </button>
      </div>

      {/* Formulario Inline para nuevo hábito */}
      {isAdding && (
        <form
          onSubmit={handleCreateHabit}
          className="mb-6 p-4 rounded-2xl bg-zinc-950/70 border border-white/10 flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <input
            type="text"
            placeholder="Nombre del hábito (ej: Ejercicios en Casa)..."
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            autoFocus
            className="flex-1 min-w-[200px] bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
          />

          <select
            value={newHabitCat}
            onChange={(e) => setNewHabitCat(e.target.value as HabitCategory)}
            className="bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="cuerpo">Cuerpo</option>
            <option value="mente">Mente</option>
            <option value="trabajo">Trabajo</option>
            <option value="espiritu">Espíritu</option>
          </select>

          <div className="flex items-center gap-1 text-xs text-zinc-400">
            <span>Meta:</span>
            <input
              type="number"
              min={1}
              max={31}
              value={newHabitTarget}
              onChange={(e) => setNewHabitTarget(Number(e.target.value))}
              className="w-14 bg-zinc-900 border border-zinc-700/80 rounded-xl px-2 py-2 text-xs text-center text-white focus:outline-none focus:border-emerald-500"
            />
            <span>días</span>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm"
          >
            Guardar Hábito
          </button>
        </form>
      )}

      {/* Contenedor con Scroll Horizontal (Lado Izquierdo Sticky + Lado Derecho Scrollable) */}
      <div className="relative overflow-x-auto rounded-2xl border border-white/[0.06] bg-zinc-950/40">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-white/[0.06] text-[11px] font-semibold uppercase tracking-wider text-zinc-400 bg-zinc-950/60">
              {/* Lado izquierdo (Fijo / Sticky) */}
              <th className="sticky left-0 z-20 bg-zinc-950/95 backdrop-blur-md px-4 py-3 min-w-[240px] sm:min-w-[280px] border-r border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <span>HÁBITO & CATEGORÍA</span>
                  <span className="mr-2">RACHA</span>
                </div>
              </th>

              {/* Lado derecho (Línea de tiempo 1 a 31) */}
              {daysArray.map((day) => {
                const isToday = day === currentDay;
                return (
                  <th
                    key={day}
                    className={`px-1 py-3 text-center min-w-[38px] ${
                      isToday
                        ? "bg-emerald-500/10 text-emerald-400 font-bold border-x border-emerald-500/30"
                        : "text-zinc-500"
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-[10px]">{day}</span>
                      {isToday && (
                        <span className="h-1 w-1 rounded-full bg-emerald-400 mt-0.5" />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-white/[0.04]">
            {habits.length === 0 ? (
              <tr>
                <td
                  colSpan={daysArray.length + 1}
                  className="py-12 text-center text-xs text-zinc-500"
                >
                  No tienes hábitos registrados aún. Haz clic en "Nuevo Hábito" para comenzar.
                </td>
              </tr>
            ) : (
              habits.map((habit) => {
                const catStyle =
                  CATEGORY_COLORS[habit.category] || CATEGORY_COLORS.mente;
                const isEditing = editingId === habit.id;

                return (
                  <tr
                    key={habit.id}
                    className="group hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Lado Izquierdo Fijo (Sticky) */}
                    <td className="sticky left-0 z-20 bg-zinc-950/95 backdrop-blur-md px-4 py-3.5 border-r border-white/[0.06]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0 pr-2">
                          {/* Nombre editable inline */}
                          {isEditing ? (
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onBlur={() => saveTitle(habit.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveTitle(habit.id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              autoFocus
                              className="w-full bg-zinc-900 border border-emerald-500/80 rounded-lg px-2 py-1 text-xs font-semibold text-white focus:outline-none"
                            />
                          ) : (
                            <div
                              onClick={() => startEditing(habit)}
                              className="group/name flex items-center gap-1.5 cursor-pointer"
                              title="Haz clic para editar el nombre"
                            >
                              <span className="text-xs sm:text-sm font-semibold text-zinc-100 truncate group-hover/name:text-emerald-400 transition-colors">
                                {habit.name}
                              </span>
                              <Edit2 className="h-3 w-3 text-zinc-600 opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0" />
                            </div>
                          )}

                          {/* Badge de Categoría + Meta */}
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                            >
                              {catStyle.label}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              Meta: {habit.monthlyTargetDays}d
                            </span>
                          </div>
                        </div>

                        {/* Racha con ícono de fuego */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 font-bold text-xs"
                            title={`Racha actual: ${habit.streak} días seguidos`}
                          >
                            <Flame className="h-3.5 w-3.5 fill-orange-400 text-orange-500" />
                            <span>{habit.streak}d</span>
                          </div>

                          <button
                            onClick={() => handleDeleteHabit(habit.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-rose-400 transition-opacity rounded"
                            title="Eliminar hábito"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Lado Derecho: Checkmarks (Días 1 a 31) */}
                    {daysArray.map((day) => {
                      const isCompleted = !!habit.completedDays[day];
                      const isToday = day === currentDay;

                      return (
                        <td
                          key={day}
                          className={`p-1 text-center align-middle ${
                            isToday ? "bg-emerald-500/[0.04] border-x border-emerald-500/20" : ""
                          }`}
                        >
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => handleToggle(habit.id, day)}
                              title={`Día ${day}: ${isCompleted ? "Completado" : "Pendiente"}`}
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-90 ${
                                isCompleted
                                  ? "bg-[#10b981] border border-[#10b981] text-zinc-950 shadow-sm shadow-emerald-500/20"
                                  : "bg-zinc-800/80 border border-zinc-700/60 hover:border-zinc-500 hover:bg-zinc-700/70 text-transparent"
                              } ${
                                isToday && !isCompleted ? "ring-1 ring-emerald-400/40" : ""
                              }`}
                            >
                              {isCompleted && (
                                <Check className="h-4 w-4 stroke-[3] text-zinc-950" />
                              )}
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer explicativo */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500 px-1">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-[#10b981]" />
          Casilla verde = Hábito cumplido
        </span>
        <span>Columna resaltada: Día {currentDay} (Hoy)</span>
      </div>
    </div>
  );
}
