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
  CalendarDays,
  Clock,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  ListTodo,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { playTaskCompletedSound } from "@/lib/sound";

interface WeeklyKanbanProps {
  initialTasks: PlannerTask[];
}

const WEEK_DAYS_BASE: { day: WeekDay; label: string; full: string; dayIndex: number }[] = [
  { day: "L", label: "L", full: "Lunes", dayIndex: 1 },
  { day: "M", label: "M", full: "Martes", dayIndex: 2 },
  { day: "X", label: "X", full: "Miércoles", dayIndex: 3 },
  { day: "J", label: "J", full: "Jueves", dayIndex: 4 },
  { day: "V", label: "V", full: "Viernes", dayIndex: 5 },
  { day: "S", label: "S", full: "Sábado", dayIndex: 6 },
  { day: "D", label: "D", full: "Domingo", dayIndex: 0 },
];

const DAY_INDEX_MAP: Record<number, WeekDay> = {
  0: "D",
  1: "L",
  2: "M",
  3: "X",
  4: "J",
  5: "V",
  6: "S",
};

const MONTH_NAMES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function formatIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function WeeklyKanban({ initialTasks }: WeeklyKanbanProps) {
  const [tasks, setTasks] = React.useState<PlannerTask[]>(initialTasks);
  const [viewMode, setViewMode] = React.useState<"week" | "month">("week");
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Fecha actual
  const today = React.useMemo(() => new Date(), []);
  const todayIso = React.useMemo(
    () => formatIsoDate(today.getFullYear(), today.getMonth(), today.getDate()),
    [today]
  );
  const todayDayKey: WeekDay = React.useMemo(() => {
    return DAY_INDEX_MAP[today.getDay()] || "L";
  }, [today]);

  const [activeDay, setActiveDay] = React.useState<WeekDay>(todayDayKey);

  // Modo mensual: navegación de mes y fecha seleccionada
  const [displayMonthDate, setDisplayMonthDate] = React.useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedMonthDateIso, setSelectedMonthDateIso] = React.useState<string>(todayIso);

  // Columnas con cálculo dinámico de isToday para modo semana
  const weekColumns = React.useMemo(() => {
    return WEEK_DAYS_BASE.map((col) => ({
      ...col,
      isToday: col.day === todayDayKey,
    }));
  }, [todayDayKey]);

  // Form states
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [priority, setPriority] = React.useState<PlannerTask["priority"]>("medium");
  const [estimatedMinutes, setEstimatedMinutes] = React.useState(45);
  const [tag, setTag] = React.useState("Enfoque");
  const [modalScheduledDate, setModalScheduledDate] = React.useState<string | undefined>(undefined);
  const [modalScheduledTime, setModalScheduledTime] = React.useState<string>("");

  // Inline form para vista mensual
  const [inlineMonthTitle, setInlineMonthTitle] = React.useState("");
  const [inlineMonthTime, setInlineMonthTime] = React.useState("");
  const [inlineMonthPriority, setInlineMonthPriority] = React.useState<PlannerTask["priority"]>("medium");
  const [inlineMonthMinutes, setInlineMonthMinutes] = React.useState(30);

  // Días del mes mostrado
  const calendarMonthData = React.useMemo(() => {
    const year = displayMonthDate.getFullYear();
    const month = displayMonthDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7; // 0 for Mon, 6 for Sun

    const days: {
      dayNum: number;
      iso: string;
      weekDayKey: WeekDay;
      isToday: boolean;
      isSelected: boolean;
    }[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const iso = formatIsoDate(year, month, d);
      const dayDate = new Date(year, month, d);
      const weekDayKey = DAY_INDEX_MAP[dayDate.getDay()] || "L";
      days.push({
        dayNum: d,
        iso,
        weekDayKey,
        isToday: iso === todayIso,
        isSelected: iso === selectedMonthDateIso,
      });
    }

    return {
      year,
      month,
      monthName: MONTH_NAMES_ES[month],
      paddingDays: firstDayOfWeek,
      days,
    };
  }, [displayMonthDate, todayIso, selectedMonthDateIso]);

  // Función para obtener tareas de una fecha
  const getTasksForDate = React.useCallback(
    (isoDate: string, weekDayKey: WeekDay) => {
      return tasks.filter((t) => {
        if (t.scheduledDate) {
          return t.scheduledDate === isoDate;
        }
        return t.day === weekDayKey;
      });
    },
    [tasks]
  );

  const selectedMonthTasks = React.useMemo(() => {
    const dateObj = new Date(selectedMonthDateIso + "T12:00:00");
    const weekDayKey = DAY_INDEX_MAP[dateObj.getDay()] || "L";
    return getTasksForDate(selectedMonthDateIso, weekDayKey);
  }, [selectedMonthDateIso, getTasksForDate]);

  const handleToggle = async (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (target && !target.completed) {
      playTaskCompletedSound();
    }
    const updated = await toggleTaskCompletion(taskId);
    setTasks(updated);
  };

  const handleDelete = async (taskId: string) => {
    const updated = await deleteTask(taskId);
    setTasks(updated);
  };

  const openAddModal = (day: WeekDay, scheduledDate?: string) => {
    setActiveDay(day);
    setModalScheduledDate(scheduledDate);
    setModalScheduledTime("");
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
      scheduledDate: modalScheduledDate,
      scheduledTime: modalScheduledTime ? modalScheduledTime.trim() : undefined,
      priority,
      estimatedMinutes: Number(estimatedMinutes) || 30,
      completed: false,
      tag: tag.trim() || "General",
    });

    setTasks(updated);
    setIsModalOpen(false);
  };

  const handlePrevMonth = () => {
    setDisplayMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setDisplayMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleCurrentMonth = () => {
    setDisplayMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedMonthDateIso(todayIso);
  };

  // Crear tarea inline en la vista mensual
  const handleCreateMonthTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineMonthTitle.trim()) return;

    const dateObj = new Date(selectedMonthDateIso + "T12:00:00");
    const weekDayKey = DAY_INDEX_MAP[dateObj.getDay()] || "L";

    const updated = await addTask({
      title: inlineMonthTitle.trim(),
      day: weekDayKey,
      scheduledDate: selectedMonthDateIso,
      scheduledTime: inlineMonthTime ? inlineMonthTime.trim() : undefined,
      priority: inlineMonthPriority,
      estimatedMinutes: Number(inlineMonthMinutes) || 30,
      completed: false,
      tag: "Plan Mensual",
    });

    setTasks(updated);
    setInlineMonthTitle("");
    setInlineMonthTime("");
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;

  const selectedMonthDateFormatted = React.useMemo(() => {
    try {
      const dateObj = new Date(selectedMonthDateIso + "T12:00:00");
      return dateObj.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    } catch {
      return selectedMonthDateIso;
    }
  }, [selectedMonthDateIso]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-violet-400 uppercase tracking-widest mb-1">
            {viewMode === "week" ? (
              <>
                <Calendar className="h-3.5 w-3.5" /> Tablero Horizontal L-D
              </>
            ) : (
              <>
                <CalendarDays className="h-3.5 w-3.5" /> Vista Mensual Programable
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Planificador {viewMode === "week" ? "Semanal" : "Mensual"}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            {viewMode === "week"
              ? "Estructura tus 7 días para proteger tus bloques de deep work y descanso."
              : "Visualiza el mes completo, programa tareas para cualquier día y gestiona tus compromisos."}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Toggle Semana / Mes */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewMode === "week"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Semanal
            </button>
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewMode === "month"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Mensual
            </button>
          </div>

          <div className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300">
            <span className="text-zinc-400">Progreso: </span>
            <strong className="text-violet-400 font-bold">
              {completedTasks}/{totalTasks} completadas
            </strong>
          </div>
        </div>
      </div>

      {/* 1. VISTA SEMANAL (KANBAN) */}
      {viewMode === "week" ? (
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x min-h-[420px] animate-in fade-in duration-200">
          {weekColumns.map((col) => {
            const columnTasks = tasks.filter((t) => t.day === col.day);
            const colCompleted = columnTasks.filter((t) => t.completed).length;

            return (
              <div
                key={col.day}
                className={cn(
                  "flex-shrink-0 w-72 sm:w-76 rounded-2xl flex flex-col transition-all border snap-start",
                  col.isToday
                    ? "bg-gradient-to-b from-zinc-900/90 to-zinc-950 border-violet-500/40 shadow-lg shadow-violet-500/10 ring-1 ring-violet-500/20"
                    : "bg-zinc-950/70 border-zinc-800/80"
                )}
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-zinc-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg font-bold text-xs shadow-sm",
                        col.isToday
                          ? "bg-violet-600 text-white shadow-violet-600/30"
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
                          <span className="text-[10px] uppercase font-bold text-violet-300 bg-violet-500/15 px-1.5 py-0.5 rounded border border-violet-500/30">
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
                    variant="ghost"
                    size="sm"
                    onClick={() => openAddModal(col.day)}
                    className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Column Tasks */}
                <div className="p-3 space-y-2.5 flex-1 overflow-y-auto max-h-[500px]">
                  {columnTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-zinc-800/80 rounded-xl bg-zinc-900/20">
                      <p className="text-xs text-zinc-400">Sin tareas programadas</p>
                      <button
                        type="button"
                        onClick={() => openAddModal(col.day)}
                        className="text-xs text-violet-400 hover:underline mt-1 font-medium cursor-pointer"
                      >
                        + Añadir una tarea
                      </button>
                    </div>
                  ) : (
                    columnTasks.map((task) => (
                      <Card
                        key={task.id}
                        className={cn(
                          "border-zinc-800/80 transition-all duration-200 group hover:border-zinc-700",
                          task.completed
                            ? "bg-zinc-900/40 opacity-60 border-zinc-800/40"
                            : "bg-zinc-900/90 shadow-sm"
                        )}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2.5">
                            <button
                              type="button"
                              onClick={() => handleToggle(task.id)}
                              className="mt-0.5 text-zinc-400 hover:text-violet-400 transition-colors cursor-pointer shrink-0"
                            >
                              {task.completed ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                              ) : (
                                <Circle className="h-4 w-4 text-zinc-500" />
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <p
                                className={cn(
                                  "text-sm font-medium leading-snug break-words",
                                  task.completed
                                    ? "line-through text-zinc-400"
                                    : "text-zinc-100"
                                )}
                              >
                                {task.title}
                              </p>

                              {task.description && (
                                <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                                  {task.description}
                                </p>
                              )}

                              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-800/60">
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-[10px] px-1.5 py-0 font-medium",
                                    task.priority === "high"
                                      ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                      : task.priority === "medium"
                                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  )}
                                >
                                  {task.priority === "high"
                                    ? "Alta"
                                    : task.priority === "medium"
                                    ? "Media"
                                    : "Baja"}
                                </Badge>

                                {task.scheduledTime && (
                                  <span className="text-[11px] text-violet-300 font-mono font-medium flex items-center gap-1 bg-violet-500/20 px-1.5 py-0.5 rounded border border-violet-500/30">
                                    <Clock className="h-3 w-3" />
                                    {task.scheduledTime}
                                  </span>
                                )}

                                <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {task.estimatedMinutes}m
                                </span>

                                <span className="text-[10px] text-zinc-400 font-medium truncate max-w-[80px]">
                                  #{task.tag}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleDelete(task.id)}
                                  className="ml-auto opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-400 transition-opacity cursor-pointer"
                                  title="Eliminar tarea"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>

                <div className="p-3 border-t border-zinc-800/80">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAddModal(col.day)}
                    className="w-full justify-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 border-zinc-800 hover:bg-zinc-900 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Añadir tarea</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA MENSUAL */
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Header de navegación del mes */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevMonth}
                  className="h-8 w-8 p-0 text-zinc-400 hover:text-white cursor-pointer"
                  title="Mes anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNextMonth}
                  className="h-8 w-8 p-0 text-zinc-400 hover:text-white cursor-pointer"
                  title="Mes siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold text-white capitalize flex items-center gap-2">
                  <span>{calendarMonthData.monthName}</span>
                  <span className="text-zinc-500 font-normal">{calendarMonthData.year}</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Haz clic en cualquier día para ver sus tareas o programar una nueva
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCurrentMonth}
              className="text-xs border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 self-start sm:self-auto cursor-pointer"
            >
              Ir a este mes
            </Button>
          </div>

          {/* Grilla Calendario */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-3 sm:p-4 overflow-hidden">
            {/* Cabecera de días de la semana */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                <div
                  key={d}
                  className="text-center text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 py-1"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Celdas del calendario */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {/* Espacios vacíos antes del primer día del mes */}
              {Array.from({ length: calendarMonthData.paddingDays }).map((_, idx) => (
                <div
                  key={`pad-${idx}`}
                  className="min-h-[70px] sm:min-h-[85px] rounded-xl bg-zinc-950/20 border border-transparent p-1.5 opacity-30"
                />
              ))}

              {/* Días del mes */}
              {calendarMonthData.days.map((item) => {
                const dayTasks = getTasksForDate(item.iso, item.weekDayKey);
                const hasPending = dayTasks.some((t) => !t.completed);
                const isPastDay = item.iso < todayIso;
                const hasOverdue = isPastDay && hasPending;

                return (
                  <div
                    key={item.iso}
                    onClick={() => setSelectedMonthDateIso(item.iso)}
                    className={cn(
                      "min-h-[70px] sm:min-h-[85px] rounded-xl p-1.5 sm:p-2 border transition-all cursor-pointer flex flex-col justify-between select-none relative group",
                      item.isSelected
                        ? "bg-violet-950/30 border-violet-500/80 shadow-md shadow-violet-950/50 ring-1 ring-violet-500/50"
                        : item.isToday
                        ? "bg-zinc-900/90 border-violet-500/40 hover:border-violet-500/60"
                        : "bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900/80 hover:border-zinc-700/80"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-xs sm:text-sm font-semibold inline-flex items-center justify-center rounded-lg w-6 h-6",
                          item.isToday
                            ? "bg-violet-600 text-white shadow-sm shadow-violet-600/50"
                            : item.isSelected
                            ? "text-violet-300 font-bold"
                            : "text-zinc-300 group-hover:text-white"
                        )}
                      >
                        {item.dayNum}
                      </span>

                      <div className="flex items-center gap-1">
                        {hasOverdue && (
                          <span
                            className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"
                            title="Tareas pendientes vencidas"
                          />
                        )}
                        {dayTasks.length > 0 && (
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium",
                              hasOverdue
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : hasPending
                                ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            )}
                          >
                            {dayTasks.length}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Previa de tareas en pantalla grande */}
                    <div className="mt-1 space-y-1 hidden sm:block">
                      {dayTasks.slice(0, 2).map((t) => (
                        <div
                          key={t.id}
                          className={cn(
                            "text-[10px] truncate px-1.5 py-0.5 rounded leading-tight",
                            t.completed
                              ? "line-through text-zinc-500 bg-zinc-950/40"
                              : "text-zinc-200 bg-zinc-800/80"
                          )}
                        >
                          {t.title}
                        </div>
                      ))}
                      {dayTasks.length > 2 && (
                        <span className="text-[9px] text-zinc-500 pl-1">
                          +{dayTasks.length - 2} más
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel de Detalle del Día Seleccionado y Programador Rápido */}
          <div className="p-4 sm:p-5 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-violet-400" />
                <h4 className="text-sm sm:text-base font-bold text-white capitalize">
                  Tareas para el {selectedMonthDateFormatted}
                </h4>
                {selectedMonthDateIso === todayIso && (
                  <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-[10px]">
                    Hoy
                  </Badge>
                )}
              </div>
              <span className="text-xs text-zinc-400">
                {selectedMonthTasks.length} {selectedMonthTasks.length === 1 ? "tarea" : "tareas"}
              </span>
            </div>

            {/* Lista de tareas de ese día */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {selectedMonthTasks.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/30">
                  <p className="text-xs text-zinc-400">No hay tareas programadas para esta fecha.</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Usa el formulario abajo para añadir una reunión o tarea.</p>
                </div>
              ) : (
                selectedMonthTasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-all group",
                      task.completed
                        ? "bg-zinc-950/40 border-zinc-800/50 opacity-60"
                        : "bg-zinc-900/90 border-zinc-800 hover:border-zinc-700"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggle(task.id)}
                        className="cursor-pointer text-zinc-400 hover:text-violet-400 transition-colors shrink-0"
                      >
                        {task.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                      </button>

                      {task.scheduledTime && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30 shrink-0 font-mono">
                          <Clock className="h-3 w-3" />
                          {task.scheduledTime}
                        </span>
                      )}

                      <div className="min-w-0">
                        <span
                          className={cn(
                            "text-sm font-medium block truncate",
                            task.completed ? "line-through text-zinc-400" : "text-zinc-100"
                          )}
                        >
                          {task.title}
                        </span>
                        {task.description && (
                          <p className="text-xs text-zinc-400 truncate">{task.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 ml-3">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] px-1.5 py-0 font-medium uppercase",
                          task.priority === "high"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : task.priority === "medium"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        )}
                      >
                        {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Media" : "Baja"}
                      </Badge>
                      <span className="text-xs text-zinc-400 hidden sm:inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {task.estimatedMinutes}m
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(task.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 transition-opacity cursor-pointer"
                        title="Eliminar tarea"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Formulario Inline Rápido para Programar Tarea */}
            <form onSubmit={handleCreateMonthTask} className="pt-2 flex flex-wrap sm:flex-nowrap items-center gap-2">
              <input
                type="text"
                placeholder={`+ Programar tarea o reunión para el ${selectedMonthDateFormatted.split(",")[0] || "día"}...`}
                value={inlineMonthTitle}
                onChange={(e) => setInlineMonthTitle(e.target.value)}
                className="flex-1 min-w-[140px] bg-zinc-900 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
              />

              <input
                type="time"
                value={inlineMonthTime}
                onChange={(e) => setInlineMonthTime(e.target.value)}
                title="Hora de la reunión o tarea (opcional)"
                className="bg-zinc-900 border border-zinc-700/80 rounded-xl px-2.5 py-2.5 text-xs sm:text-sm text-violet-300 font-mono focus:outline-none focus:border-violet-500 cursor-pointer"
              />

              <select
                value={inlineMonthPriority}
                onChange={(e) => setInlineMonthPriority(e.target.value as any)}
                className="bg-zinc-900 border border-zinc-700/80 rounded-xl px-2.5 py-2.5 text-xs sm:text-sm text-zinc-300 focus:outline-none focus:border-violet-500 cursor-pointer"
              >
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>

              <select
                value={inlineMonthMinutes}
                onChange={(e) => setInlineMonthMinutes(Number(e.target.value))}
                className="hidden sm:block bg-zinc-900 border border-zinc-700/80 rounded-xl px-2.5 py-2.5 text-xs sm:text-sm text-zinc-300 focus:outline-none focus:border-violet-500 cursor-pointer"
              >
                <option value={15}>15m</option>
                <option value={30}>30m</option>
                <option value={45}>45m</option>
                <option value={60}>60m</option>
              </select>

              <button
                type="submit"
                className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0 shadow-md shadow-violet-600/30 flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Programar</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dialog para añadir tarea */}
      <Dialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title="Programar Nueva Tarea o Reunión"
        description="Añade un bloque de enfoque o reunión con horario a tu planificador."
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
              Título de la Tarea / Reunión
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Reunión de sincronización de equipo..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
              Detalles / Enlace de Reunión (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Notas clave, enlace a Google Meet / Zoom..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                Día
              </label>
              <select
                value={activeDay}
                onChange={(e) => setActiveDay(e.target.value as WeekDay)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none cursor-pointer"
              >
                {weekColumns.map((w) => (
                  <option key={w.day} value={w.day}>
                    {w.full}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                Hora (opcional)
              </label>
              <input
                type="time"
                value={modalScheduledTime}
                onChange={(e) => setModalScheduledTime(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-sm text-violet-300 font-mono focus:border-violet-500 focus:outline-none cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                Prioridad
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PlannerTask["priority"])}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none cursor-pointer"
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
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none"
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
