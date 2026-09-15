"use client";

import * as React from "react";
import { PlannerTask, WeekDay } from "@/lib/types";
import { toggleTaskCompletion, addTask, deleteTask } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  Trash2,
  Sparkles,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WeeklyKanbanProps {
  initialTasks: PlannerTask[];
}

const WEEK_COLUMNS: { day: WeekDay; label: string; full: string; isToday?: boolean }[] = [
  { day: "L", label: "L", full: "Lunes" },
  { day: "M", label: "M", full: "Martes", isToday: true }, // Marcado como hoy
  { day: "X", label: "X", full: "Miércoles" },
  { day: "J", label: "J", full: "Jueves" },
  { day: "V", label: "V", full: "Viernes" },
  { day: "S", label: "S", full: "Sábado" },
  { day: "D", label: "D", full: "Domingo" },
];

export function WeeklyKanban({ initialTasks }: WeeklyKanbanProps) {
  const [tasks, setTasks] = React.useState<PlannerTask[]>(initialTasks);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [activeDay, setActiveDay] = React.useState<WeekDay>("M");

  // Form states
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [priority, setPriority] = React.useState<PlannerTask["priority"]>("medium");
  const [estimatedMinutes, setEstimatedMinutes] = React.useState(45);
  const [tag, setTag] = React.useState("Enfoque");

  const handleToggle = async (taskId: string) => {
    const updated = await toggleTaskCompletion(taskId);
    setTasks(updated);
  };

  const handleDelete = async (taskId: string) => {
    const updated = await deleteTask(taskId);
    setTasks(updated);
  };

  const openAddModal = (day: WeekDay) => {
    setActiveDay(day);
    setTitle("");
    setDescription("");
    setIsModalOpen(true);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const updated = await addTask({
      title: title.trim(),
      description: description.trim(),
      day: activeDay,
      priority,
      estimatedMinutes: Number(estimatedMinutes) || 30,
      completed: false,
      tag: tag.trim() || "General",
    });

    setTasks(updated);
    setIsModalOpen(false);
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-1">
            <Calendar className="h-3.5 w-3.5" /> Tablero Horizontal L-D
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Planificador Semanal
          </h1>
          <p className="text-sm text-zinc-400">
            Estructura tus 7 días para proteger tus bloques de deep work y descanso.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300">
            <span className="text-zinc-400">Progreso semanal: </span>
            <strong className="text-emerald-400 font-bold">
              {completedTasks}/{totalTasks} completadas
            </strong>
          </div>
        </div>
      </div>

      {/* Horizontal Scrollable Kanban Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x min-h-[550px]">
        {WEEK_COLUMNS.map((col) => {
          const columnTasks = tasks.filter((t) => t.day === col.day);
          const colCompleted = columnTasks.filter((t) => t.completed).length;

          return (
            <div
              key={col.day}
              className={cn(
                "flex-shrink-0 w-80 rounded-2xl flex flex-col transition-all border snap-start",
                col.isToday
                  ? "bg-gradient-to-b from-zinc-900/90 to-zinc-950 border-emerald-500/30 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/20"
                  : "bg-zinc-950/70 border-zinc-800/80"
              )}
            >
              {/* Column Header */}
              <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-xl font-bold text-xs shadow-sm",
                      col.isToday
                        ? "bg-emerald-500 text-zinc-950"
                        : "bg-zinc-800 text-zinc-300"
                    )}
                  >
                    {col.label}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-zinc-100">
                        {col.full}
                      </span>
                      {col.isToday && (
                        <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          Hoy
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-400">
                      {colCompleted}/{columnTasks.length} listas
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => openAddModal(col.day)}
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-zinc-400 hover:text-white"
                  title={`Añadir tarea a ${col.full}`}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Column Task Cards */}
              <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[580px]">
                {columnTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400 border border-dashed border-zinc-800/60 rounded-xl m-1">
                    <p className="text-xs">Sin tareas asignadas</p>
                    <button
                      onClick={() => openAddModal(col.day)}
                      className="text-xs text-emerald-400 hover:underline mt-1 cursor-pointer"
                    >
                      + Añadir primera tarea
                    </button>
                  </div>
                ) : (
                  columnTasks.map((task) => {
                    const priorityConfig = {
                      high: { label: "Alta", color: "text-rose-300 bg-rose-500/10 border-rose-500/20" },
                      medium: { label: "Media", color: "text-amber-300 bg-amber-500/10 border-amber-500/20" },
                      low: { label: "Baja", color: "text-zinc-400 bg-zinc-800/50 border-zinc-700/40" },
                    }[task.priority];

                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "group/card rounded-xl p-3.5 border transition-all duration-200 backdrop-blur-sm",
                          task.completed
                            ? "bg-zinc-900/30 border-zinc-800/50 opacity-70"
                            : "bg-zinc-900/70 border-zinc-800 hover:border-zinc-700/80 hover:bg-zinc-900 shadow-sm"
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleToggle(task.id)}
                            className={cn(
                              "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-all cursor-pointer",
                              task.completed
                                ? "bg-emerald-500 border-emerald-500 text-zinc-950"
                                : "border-zinc-700 hover:border-zinc-500 text-transparent"
                            )}
                          >
                            <CheckCircle2 className="h-3 w-3 fill-current" />
                          </button>

                          <div className="flex-1 min-w-0">
                            <h4
                              className={cn(
                                "text-xs sm:text-sm font-semibold leading-snug transition-all",
                                task.completed
                                  ? "line-through text-zinc-400"
                                  : "text-zinc-100"
                              )}
                            >
                              {task.title}
                            </h4>

                            {task.description && (
                              <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                                {task.description}
                              </p>
                            )}

                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-800/40 text-[10px]">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px] font-medium border",
                                    priorityConfig.color
                                  )}
                                >
                                  {priorityConfig.label}
                                </span>

                                <span className="inline-flex items-center gap-1 text-zinc-400 bg-zinc-800/60 px-1.5 py-0.5 rounded">
                                  <Clock className="h-3 w-3" />
                                  {task.estimatedMinutes}m
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDelete(task.id)}
                                className="opacity-0 group-hover/card:opacity-100 text-zinc-400 hover:text-rose-400 transition-opacity p-1"
                                title="Eliminar tarea"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog para agregar tarea a un día */}
      <Dialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={`Añadir Tarea para el ${WEEK_COLUMNS.find((w) => w.day === activeDay)?.full || activeDay}`}
        description="Define una acción concreta con estimación realista de tiempo."
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
              Título de la Tarea
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Rediseñar flujo de autenticación..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
              Detalles / Contexto (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Notas clave o enlaces de referencia..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                Día
              </label>
              <select
                value={activeDay}
                onChange={(e) => setActiveDay(e.target.value as WeekDay)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              >
                {WEEK_COLUMNS.map((w) => (
                  <option key={w.day} value={w.day}>
                    {w.full}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                Prioridad
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PlannerTask["priority"])}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              >
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                Minutos Est.
              </label>
              <input
                type="number"
                min={15}
                step={15}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="glow">
              Crear Tarea
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
