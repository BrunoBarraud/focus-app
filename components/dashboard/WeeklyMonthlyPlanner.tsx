"use client";

import * as React from "react";
import { PlannerTask, WeekDay } from "@/lib/types";
import { toggleTaskCompletion, addTask, deleteTask } from "@/lib/api";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Clock,
  Tag,
  ChevronLeft,
  ChevronRight,
  ListTodo,
} from "lucide-react";

interface WeeklyMonthlyPlannerProps {
  initialTasks: PlannerTask[];
}

const WEEK_DAYS: { key: WeekDay; name: string; short: string; dateNum: number }[] = [
  { key: "L", name: "Lunes", short: "Lun", dateNum: 14 },
  { key: "M", name: "Martes", short: "Mar", dateNum: 15 },
  { key: "X", name: "Miércoles", short: "Mié", dateNum: 16 }, // Hoy
  { key: "J", name: "Jueves", short: "Jue", dateNum: 17 },
  { key: "V", name: "Viernes", short: "Vie", dateNum: 18 },
  { key: "S", name: "Sábado", short: "Sáb", dateNum: 19 },
  { key: "D", name: "Domingo", short: "Dom", dateNum: 20 },
];

const PRIORITY_BADGES = {
  high: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export function WeeklyMonthlyPlanner({ initialTasks }: WeeklyMonthlyPlannerProps) {
  const [tasks, setTasks] = React.useState<PlannerTask[]>(initialTasks);
  const [selectedDay, setSelectedDay] = React.useState<WeekDay>("X"); // Miércoles 16 por defecto
  const [viewMode, setViewMode] = React.useState<"week" | "month">("week");
  const [selectedMonthDay, setSelectedMonthDay] = React.useState<number>(16);

  // Formulario inline rápido
  const [newTaskTitle, setNewTaskTitle] = React.useState("");
  const [newTaskPriority, setNewTaskPriority] = React.useState<"high" | "medium" | "low">("medium");
  const [newTaskMinutes, setNewTaskMinutes] = React.useState(30);
  const [newTaskTag, setNewTaskTag] = React.useState("Enfoque");

  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Filtrar tareas según el día seleccionado en modo semana
  const dayTasks = React.useMemo(() => {
    return tasks.filter((t) => t.day === selectedDay);
  }, [tasks, selectedDay]);

  // Alternar estado de completitud optimista
  const handleToggleTask = async (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );

    try {
      await toggleTaskCompletion(taskId);
    } catch (err) {
      console.error("Error al actualizar tarea:", err);
    }
  };

  // Crear tarea inline
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const tempTask: PlannerTask = {
      id: "temp-" + Date.now(),
      title: newTaskTitle.trim(),
      day: selectedDay,
      priority: newTaskPriority,
      estimatedMinutes: newTaskMinutes,
      completed: false,
      tag: newTaskTag,
    };

    setTasks((prev) => [...prev, tempTask]);
    setNewTaskTitle("");

    try {
      const updated = await addTask({
        title: tempTask.title,
        day: tempTask.day,
        priority: tempTask.priority,
        estimatedMinutes: tempTask.estimatedMinutes,
        completed: false,
        tag: tempTask.tag,
      });
      setTasks(updated);
    } catch (err) {
      console.error("Error al añadir tarea:", err);
    }
  };

  // Eliminar tarea
  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await deleteTask(taskId);
    } catch (err) {
      console.error("Error al eliminar tarea:", err);
    }
  };

  // Datos para vista mensual compacta (30/31 días)
  const monthDays = React.useMemo(() => Array.from({ length: 30 }, (_, i) => i + 1), []);

  return (
    <div className="w-full rounded-[22px] border border-white/[0.08] bg-zinc-900/60 backdrop-blur-xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col justify-between">
      {/* Header con Switch Semana / Mes */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <CalendarIcon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Organizador Inteligente
              </h2>
              <p className="text-xs text-zinc-400">
                {viewMode === "week" ? "Semana en curso • Mié 16 (Hoy)" : "Calendario del Mes • Septiembre"}
              </p>
            </div>
          </div>

          <div className="flex items-center bg-zinc-950/80 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewMode === "week"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setViewMode("month")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewMode === "month"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Ver Mes
            </button>
          </div>
        </div>

        {/* 1. VISTA SEMANA: Slider horizontal interactivo con días */}
        {viewMode === "week" ? (
          <div className="space-y-4">
            {/* Slider de Días de la Semana */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {WEEK_DAYS.map((d) => {
                const isSelected = selectedDay === d.key;
                const isToday = d.dateNum === 16;
                const tasksForDay = tasks.filter((t) => t.day === d.key);
                const completedCount = tasksForDay.filter((t) => t.completed).length;

                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setSelectedDay(d.key)}
                    className={`flex-1 min-w-[76px] sm:min-w-[88px] py-2.5 px-2 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between ${
                      isSelected
                        ? "bg-violet-600/20 border-violet-500 text-white shadow-lg shadow-violet-500/10 ring-1 ring-violet-500"
                        : "bg-zinc-950/50 border-white/[0.06] text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1 w-full">
                      <span className="text-[11px] uppercase tracking-wider font-semibold">
                        {d.short}
                      </span>
                      {isToday && (
                        <span className="px-1.5 py-0.5 text-[8px] font-black bg-emerald-400 text-zinc-950 rounded-md tracking-wider leading-none shadow-xs">
                          HOY
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-lg sm:text-xl font-extrabold block my-0.5 ${
                        isToday ? "text-emerald-400" : isSelected ? "text-white" : "text-zinc-200"
                      }`}
                    >
                      {d.dateNum}
                    </span>
                    <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-400">
                      <span>
                        {tasksForDay.length > 0 ? `${completedCount}/${tasksForDay.length}` : "—"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Expansión de Tareas in-situ para el día seleccionado */}
            <div className="rounded-2xl bg-zinc-950/60 border border-white/[0.06] p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400 border-b border-white/[0.06] pb-2">
                <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                  <ListTodo className="h-3.5 w-3.5 text-violet-400" />
                  Tareas para {WEEK_DAYS.find((d) => d.key === selectedDay)?.name}{" "}
                  {WEEK_DAYS.find((d) => d.key === selectedDay)?.dateNum}
                </span>
                <span>{dayTasks.length} planificadas</span>
              </div>

              {/* Lista de Tareas in-situ */}
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {dayTasks.length === 0 ? (
                  <div className="py-6 text-center text-xs text-zinc-500">
                    No hay tareas para este día. Escribe abajo para añadir una.
                  </div>
                ) : (
                  dayTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                        task.completed
                          ? "bg-zinc-900/40 border-white/[0.03] opacity-60"
                          : "bg-zinc-900/80 border-white/[0.06] hover:border-violet-500/40"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleTask(task.id)}
                          className="cursor-pointer text-zinc-500 hover:text-violet-400 transition-colors shrink-0"
                        >
                          {task.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <Circle className="h-4 w-4" />
                          )}
                        </button>
                        <span
                          className={`text-xs font-medium truncate ${
                            task.completed ? "line-through text-zinc-500" : "text-zinc-200"
                          }`}
                        >
                          {task.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                            PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.medium
                          }`}
                        >
                          {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Media" : "Baja"}
                        </span>
                        <span className="text-[10px] text-zinc-500 hidden sm:inline-flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {task.estimatedMinutes}m
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-rose-400 transition-opacity"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Formulario Inline rápido para agregar tareas */}
              <form onSubmit={handleAddTask} className="pt-2 flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`+ Nueva tarea para ${
                    WEEK_DAYS.find((d) => d.key === selectedDay)?.short
                  }... presiona Enter`}
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
                />

                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as any)}
                  className="bg-zinc-900 border border-zinc-700/80 rounded-xl px-2 py-2 text-xs text-zinc-300 focus:outline-none focus:border-violet-500"
                >
                  <option value="high">Alta</option>
                  <option value="medium">Media</option>
                  <option value="low">Baja</option>
                </select>

                <button
                  type="submit"
                  className="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* 2. VISTA MES: Calendario compacto editable */
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold text-zinc-500 pb-1">
              <span>L</span>
              <span>M</span>
              <span>X</span>
              <span>J</span>
              <span>V</span>
              <span>S</span>
              <span>D</span>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {monthDays.map((d) => {
                const isToday = d === 16;
                const isSelected = selectedMonthDay === d;
                const dayMod = (d - 1) % 7;
                const dayKey = WEEK_DAYS[dayMod]?.key || "L";
                const dayCount = tasks.filter((t) => t.day === dayKey).length;

                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setSelectedMonthDay(d);
                      setSelectedDay(dayKey);
                    }}
                    className={`h-12 rounded-xl border flex flex-col items-center justify-between p-1.5 transition-all cursor-pointer ${
                      isToday
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold ring-1 ring-emerald-500/30"
                        : isSelected
                        ? "bg-violet-600/20 border-violet-500 text-white"
                        : "bg-zinc-950/40 border-white/[0.04] text-zinc-400 hover:bg-zinc-800/40"
                    }`}
                  >
                    <span className="text-xs">{d}</span>
                    <div className="flex gap-0.5">
                      {dayCount > 0 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/[0.06] text-xs flex items-center justify-between">
              <span className="text-zinc-400">
                Día seleccionado: <strong className="text-white">Día {selectedMonthDay}</strong>
              </span>
              <button
                onClick={() => setViewMode("week")}
                className="text-violet-400 hover:underline font-medium"
              >
                Abrir en vista detallada &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
