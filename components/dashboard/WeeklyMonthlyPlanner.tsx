"use client";

import * as React from "react";
import { PlannerTask, WeekDay } from "@/lib/types";
import { addTaskAction, deleteTaskAction, toggleTaskAction } from "@/app/actions";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Clock,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  CalendarDays,
  Sparkles,
} from "lucide-react";

interface WeeklyMonthlyPlannerProps {
  initialTasks: PlannerTask[];
}

const WEEK_DAYS_META: { key: WeekDay; name: string; short: string; dayIndex: number }[] = [
  { key: "L", name: "Lunes", short: "Lun", dayIndex: 1 },
  { key: "M", name: "Martes", short: "Mar", dayIndex: 2 },
  { key: "X", name: "Miércoles", short: "Mié", dayIndex: 3 },
  { key: "J", name: "Jueves", short: "Jue", dayIndex: 4 },
  { key: "V", name: "Viernes", short: "Vie", dayIndex: 5 },
  { key: "S", name: "Sábado", short: "Sáb", dayIndex: 6 },
  { key: "D", name: "Domingo", short: "Dom", dayIndex: 0 },
];

const MONTH_NAMES_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const PRIORITY_BADGES = {
  high: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

function formatIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getWeekDayKeyFromDate(date: Date): WeekDay {
  const dayIndex = date.getDay(); // 0 is Sun, 1 is Mon...
  const found = WEEK_DAYS_META.find((m) => m.dayIndex === dayIndex);
  return found ? found.key : "L";
}

export function WeeklyMonthlyPlanner({ initialTasks }: WeeklyMonthlyPlannerProps) {
  const [tasks, setTasks] = React.useState<PlannerTask[]>(initialTasks);
  const [viewMode, setViewMode] = React.useState<"week" | "month">("month");

  // Fecha de referencia actual
  const today = React.useMemo(() => new Date(), []);
  const todayIso = React.useMemo(
    () => formatIsoDate(today.getFullYear(), today.getMonth(), today.getDate()),
    [today]
  );
  const todayWeekDayKey = React.useMemo(() => getWeekDayKeyFromDate(today), [today]);

  // Modo Semana: día seleccionado (por defecto hoy)
  const [selectedDay, setSelectedDay] = React.useState<WeekDay>(todayWeekDayKey);

  // Modo Mes: navegación del mes actual y fecha seleccionada
  const [displayDate, setDisplayDate] = React.useState<Date>(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDateIso, setSelectedDateIso] = React.useState<string>(todayIso);

  // Formularios inline
  const [newTaskTitle, setNewTaskTitle] = React.useState("");
  const [newTaskPriority, setNewTaskPriority] = React.useState<"high" | "medium" | "low">("medium");
  const [newTaskMinutes, setNewTaskMinutes] = React.useState(30);

  // Sincronizar estado cuando el Server Component revalida
  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // 1. Días de la semana actual (Lunes a Domingo)
  const currentWeekDays = React.useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);

    return WEEK_DAYS_META.map((meta, i) => {
      const dateObj = new Date(monday);
      dateObj.setDate(monday.getDate() + i);
      const iso = formatIsoDate(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
      const isToday = iso === todayIso;

      return {
        ...meta,
        dateNum: dateObj.getDate(),
        iso,
        isToday,
      };
    });
  }, [todayIso]);

  // 2. Días del mes mostrado
  const calendarDays = React.useMemo(() => {
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();

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
      const weekDayKey = getWeekDayKeyFromDate(dayDate);
      days.push({
        dayNum: d,
        iso,
        weekDayKey,
        isToday: iso === todayIso,
        isSelected: iso === selectedDateIso,
      });
    }

    return {
      paddingDays: firstDayOfWeek,
      days,
      year,
      month,
      monthName: MONTH_NAMES_ES[month],
    };
  }, [displayDate, todayIso, selectedDateIso]);

  // Filtrar tareas para un día específico
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

  // Tareas para el día activo en modo semana
  const weekDayTasks = React.useMemo(() => {
    const dayMeta = currentWeekDays.find((d) => d.key === selectedDay);
    if (!dayMeta) return [];
    return getTasksForDate(dayMeta.iso, dayMeta.key);
  }, [currentWeekDays, selectedDay, getTasksForDate]);

  // Tareas para la fecha seleccionada en modo mes
  const selectedDateTasks = React.useMemo(() => {
    const dateObj = new Date(selectedDateIso + "T12:00:00");
    const weekDayKey = getWeekDayKeyFromDate(dateObj);
    return getTasksForDate(selectedDateIso, weekDayKey);
  }, [selectedDateIso, getTasksForDate]);

  // Toggle tarea con optimismo
  const handleToggleTask = async (taskId: string) => {
    const previousTasks = tasks;
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );

    try {
      const res = await toggleTaskAction(taskId);
      if (res?.error) {
        console.error("Error al actualizar tarea:", res.error);
        setTasks(previousTasks);
      }
    } catch (err) {
      console.error("Error al actualizar tarea:", err);
      setTasks(previousTasks);
    }
  };

  // Eliminar tarea
  const handleDeleteTask = async (taskId: string) => {
    const previousTasks = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      const res = await deleteTaskAction(taskId);
      if (res?.error) {
        console.error("Error al eliminar tarea:", res.error);
        setTasks(previousTasks);
      }
    } catch (err) {
      console.error("Error al eliminar tarea:", err);
      setTasks(previousTasks);
    }
  };

  // Añadir tarea en modo semana
  const handleAddWeekTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const dayMeta = currentWeekDays.find((d) => d.key === selectedDay);
    const targetIso = dayMeta ? dayMeta.iso : todayIso;

    const previousTasks = tasks;
    const tempId = "temp-" + Date.now();
    const tempTask: PlannerTask = {
      id: tempId,
      title: newTaskTitle.trim(),
      day: selectedDay,
      scheduledDate: targetIso,
      priority: newTaskPriority,
      estimatedMinutes: newTaskMinutes,
      completed: false,
      tag: "Enfoque",
    };

    setTasks((prev) => [...prev, tempTask]);
    setNewTaskTitle("");

    try {
      const res = await addTaskAction({
        title: tempTask.title,
        day: tempTask.day,
        scheduledDate: tempTask.scheduledDate,
        priority: tempTask.priority,
        estimatedMinutes: tempTask.estimatedMinutes,
        completed: false,
        tag: tempTask.tag,
      });

      if (res?.error) {
        console.error("Error al añadir tarea en Supabase:", res.error);
        setTasks(previousTasks);
      } else if (res?.task) {
        setTasks((prev) =>
          prev.map((t) => (t.id === tempId ? { ...t, id: res.task.id } : t))
        );
      }
    } catch (err) {
      console.error("Error al añadir tarea:", err);
      setTasks(previousTasks);
    }
  };

  // Añadir tarea en modo mensual (100% PROGRAMABLE)
  const handleAddMonthTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const dateObj = new Date(selectedDateIso + "T12:00:00");
    const weekDayKey = getWeekDayKeyFromDate(dateObj);

    const previousTasks = tasks;
    const tempId = "temp-" + Date.now();
    const tempTask: PlannerTask = {
      id: tempId,
      title: newTaskTitle.trim(),
      day: weekDayKey,
      scheduledDate: selectedDateIso,
      priority: newTaskPriority,
      estimatedMinutes: newTaskMinutes,
      completed: false,
      tag: "Plan Mensual",
    };

    setTasks((prev) => [...prev, tempTask]);
    setNewTaskTitle("");

    try {
      const res = await addTaskAction({
        title: tempTask.title,
        day: tempTask.day,
        scheduledDate: tempTask.scheduledDate,
        priority: tempTask.priority,
        estimatedMinutes: tempTask.estimatedMinutes,
        completed: false,
        tag: tempTask.tag,
      });

      if (res?.error) {
        console.error("Error al programar tarea mensual en Supabase:", res.error);
        setTasks(previousTasks);
      } else if (res?.task) {
        setTasks((prev) =>
          prev.map((t) => (t.id === tempId ? { ...t, id: res.task.id } : t))
        );
      }
    } catch (err) {
      console.error("Error al programar tarea mensual:", err);
      setTasks(previousTasks);
    }
  };

  // Navegación de meses
  const handlePrevMonth = () => {
    setDisplayDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setDisplayDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleGoToToday = () => {
    setDisplayDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateIso(todayIso);
  };

  // Formato amigable para el encabezado del día seleccionado
  const selectedDateFormatted = React.useMemo(() => {
    try {
      const dateObj = new Date(selectedDateIso + "T12:00:00");
      return dateObj.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    } catch {
      return selectedDateIso;
    }
  }, [selectedDateIso]);

  return (
    <div className="w-full rounded-[22px] border border-white/[0.08] bg-zinc-900/60 backdrop-blur-xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col justify-between">
      {/* Header Principal con Switch Semana / Mes */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              {viewMode === "month" ? (
                <CalendarDays className="h-4 w-4 text-violet-400" />
              ) : (
                <CalendarIcon className="h-4 w-4 text-violet-400" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Planificador Inteligente
                {viewMode === "month" && (
                  <span className="text-[10px] uppercase font-bold text-violet-300 bg-violet-500/20 border border-violet-500/30 px-2 py-0.5 rounded-full">
                    Programable
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-400">
                {viewMode === "week"
                  ? "Semana en curso • Organización L-D"
                  : `${calendarDays.monthName} ${calendarDays.year} • Programa y gestiona cualquier día`}
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center self-start sm:self-auto bg-zinc-950/80 p-1 rounded-xl border border-white/10 shadow-inner">
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewMode === "week"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === "month"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>Vista Mensual</span>
            </button>
          </div>
        </div>

        {/* 1. VISTA SEMANA: Slider horizontal interactivo */}
        {viewMode === "week" ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Días de la semana */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {currentWeekDays.map((d) => {
                const isSelected = selectedDay === d.key;
                const tasksForDay = getTasksForDate(d.iso, d.key);
                const completedCount = tasksForDay.filter((t) => t.completed).length;

                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setSelectedDay(d.key)}
                    className={`flex-1 min-w-[76px] sm:min-w-[84px] py-2.5 px-2 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between ${
                      isSelected
                        ? "bg-violet-600/20 border-violet-500 text-white shadow-lg shadow-violet-500/10 ring-1 ring-violet-500"
                        : "bg-zinc-950/50 border-white/[0.06] text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1 w-full">
                      <span className="text-[11px] uppercase tracking-wider font-semibold">
                        {d.short}
                      </span>
                      {d.isToday && (
                        <span className="px-1.5 py-0.5 text-[8px] font-black bg-emerald-400 text-zinc-950 rounded-md tracking-wider leading-none shadow-xs">
                          HOY
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-lg sm:text-xl font-extrabold block my-0.5 ${
                        d.isToday ? "text-emerald-400" : isSelected ? "text-white" : "text-zinc-200"
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

            {/* Expansión de Tareas para el día seleccionado */}
            <div className="rounded-2xl bg-zinc-950/60 border border-white/[0.06] p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400 border-b border-white/[0.06] pb-2">
                <span className="font-semibold text-zinc-200 flex items-center gap-1.5 capitalize">
                  <ListTodo className="h-3.5 w-3.5 text-violet-400" />
                  Tareas para {currentWeekDays.find((d) => d.key === selectedDay)?.name}{" "}
                  {currentWeekDays.find((d) => d.key === selectedDay)?.dateNum}
                </span>
                <span className="text-[11px] text-zinc-400">
                  {weekDayTasks.filter((t) => t.completed).length}/{weekDayTasks.length} listas
                </span>
              </div>

              {/* Lista de Tareas */}
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {weekDayTasks.length === 0 ? (
                  <div className="py-6 text-center text-xs text-zinc-500">
                    No hay tareas para este día. Escribe abajo para añadir una.
                  </div>
                ) : (
                  weekDayTasks.map((task) => (
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

              {/* Formulario rápido */}
              <form onSubmit={handleAddWeekTask} className="pt-2 flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`+ Nueva tarea para ${
                    currentWeekDays.find((d) => d.key === selectedDay)?.short
                  }...`}
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
          /* 2. VISTA MENSUAL PROGRAMABLE */
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Navegación de mes */}
            <div className="flex items-center justify-between bg-zinc-950/60 border border-white/[0.06] rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Mes anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-bold text-white tracking-wide">
                  {calendarDays.monthName} {calendarDays.year}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Mes siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleGoToToday}
                className="text-[11px] font-semibold text-violet-400 hover:text-violet-300 px-2 py-1 rounded-lg hover:bg-violet-500/10 transition-colors cursor-pointer"
              >
                Ir a Hoy
              </button>
            </div>

            {/* Cabecera de días de la semana */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-zinc-400 pb-0.5">
              <span>LUN</span>
              <span>MAR</span>
              <span>MIÉ</span>
              <span>JUE</span>
              <span>VIE</span>
              <span>SÁB</span>
              <span>DOM</span>
            </div>

            {/* Grilla del Mes */}
            <div className="grid grid-cols-7 gap-1.5">
              {/* Celdas de padding para inicio de mes */}
              {Array.from({ length: calendarDays.paddingDays }).map((_, i) => (
                <div
                  key={`pad-${i}`}
                  className="h-11 sm:h-12 rounded-xl border border-transparent opacity-20 bg-zinc-950/20"
                />
              ))}

              {/* Días reales del mes */}
              {calendarDays.days.map((d) => {
                const dayTasks = getTasksForDate(d.iso, d.weekDayKey);
                const total = dayTasks.length;
                const completed = dayTasks.filter((t) => t.completed).length;
                const hasPending = total > completed;

                return (
                  <button
                    key={d.iso}
                    type="button"
                    onClick={() => setSelectedDateIso(d.iso)}
                    className={`h-11 sm:h-12 rounded-xl border flex flex-col items-center justify-between p-1 transition-all cursor-pointer relative group ${
                      d.isSelected
                        ? "bg-violet-600/25 border-violet-500 text-white shadow-md shadow-violet-500/20 ring-1 ring-violet-500"
                        : d.isToday
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold ring-1 ring-emerald-500/20"
                        : "bg-zinc-950/50 border-white/[0.04] text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full px-1">
                      <span className={`text-[11px] font-semibold ${d.isToday ? "text-emerald-400" : ""}`}>
                        {d.dayNum}
                      </span>
                      {d.isToday && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      )}
                    </div>

                    {/* Indicadores de Tareas Programadas */}
                    <div className="flex items-center gap-0.5 pb-0.5">
                      {total > 0 && (
                        <span
                          className={`text-[9px] px-1 rounded font-bold leading-none py-0.5 ${
                            hasPending
                              ? "bg-violet-500/30 text-violet-300 border border-violet-500/40"
                              : "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
                          }`}
                        >
                          {completed}/{total}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* SECCIÓN PROGRAMABLE: Panel de Tareas para la Fecha Seleccionada */}
            <div className="rounded-2xl bg-zinc-950/80 border border-violet-500/30 p-4 space-y-3 shadow-lg shadow-violet-950/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-white/[0.08] pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400">
                    <ListTodo className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-bold text-xs sm:text-sm text-zinc-100 capitalize">
                    Tareas para el {selectedDateFormatted}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-400">
                    {selectedDateTasks.filter((t) => t.completed).length} de {selectedDateTasks.length} completadas
                  </span>
                  {selectedDateIso === todayIso && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-400/20 text-emerald-400 border border-emerald-400/30 rounded-md">
                      HOY
                    </span>
                  )}
                </div>
              </div>

              {/* Lista de Tareas para la fecha seleccionada */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {selectedDateTasks.length === 0 ? (
                  <div className="py-5 text-center text-xs text-zinc-500 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800">
                    No hay tareas programadas para este día del mes.
                    <p className="text-[11px] text-violet-400/80 mt-0.5">
                      Programa una abajo y se guardará directamente en tu calendario.
                    </p>
                  </div>
                ) : (
                  selectedDateTasks.map((task) => (
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

              {/* Formulario Inline para Programar Tarea en la Fecha Seleccionada */}
              <form onSubmit={handleAddMonthTask} className="pt-1 flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`+ Programar tarea para el ${selectedDateFormatted.split(",")[0] || "día"}...`}
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
                />

                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as any)}
                  className="bg-zinc-900 border border-zinc-700/80 rounded-xl px-2 py-2 text-xs text-zinc-300 focus:outline-none focus:border-violet-500 cursor-pointer"
                >
                  <option value="high">Alta</option>
                  <option value="medium">Media</option>
                  <option value="low">Baja</option>
                </select>

                <select
                  value={newTaskMinutes}
                  onChange={(e) => setNewTaskMinutes(Number(e.target.value))}
                  className="hidden sm:block bg-zinc-900 border border-zinc-700/80 rounded-xl px-2 py-2 text-xs text-zinc-300 focus:outline-none focus:border-violet-500 cursor-pointer"
                >
                  <option value={15}>15m</option>
                  <option value={30}>30m</option>
                  <option value={45}>45m</option>
                  <option value={60}>60m</option>
                </select>

                <button
                  type="submit"
                  className="px-3.5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 shadow-md shadow-violet-600/30 flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Programar</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
