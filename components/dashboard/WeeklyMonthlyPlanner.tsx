"use client";

import * as React from "react";
import type { PlannerData, TaskPriority } from "@/lib/types";
import { CALENDAR_COLORS } from "@/lib/calendar-colors";
import { monthDates, mondayOffset, parseIsoDate, weekDates, weekDayOf } from "@/lib/dates";
import { playTaskCompletedSound } from "@/lib/sound";
import { useToday } from "@/lib/use-today";
import { isTempId, usePlanner } from "@/components/planificador/usePlanner";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  ListTodo,
  X,
  Loader2,
  Repeat,
} from "lucide-react";

interface WeeklyMonthlyPlannerProps {
  initialData: PlannerData;
}

const PRIORITY_BADGES: Record<TaskPriority, string> = {
  high: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const SHORT_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const CARD_CLASS =
  "w-full rounded-[22px] border border-white/[0.08] bg-zinc-900/60 backdrop-blur-xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col justify-between";

export function WeeklyMonthlyPlanner({ initialData }: WeeklyMonthlyPlannerProps) {
  const today = useToday();
  // El servidor corre en UTC: "hoy" solo se conoce en el cliente.
  if (!today) return <div className={`${CARD_CLASS} min-h-[440px] animate-pulse`} />;
  return <Planner initialData={initialData} today={today} />;
}

function Planner({ initialData, today }: { initialData: PlannerData; today: string }) {
  const { calendars, occurrences, toggle, addTask, deleteTask, addCalendar } = usePlanner(initialData);

  const [viewMode, setViewMode] = React.useState<"week" | "month">("week");
  const [selectedDate, setSelectedDate] = React.useState<string>(today);
  const [selectedCalendar, setSelectedCalendar] = React.useState<string>("all");

  // Formulario inline rápido
  const [newTaskTitle, setNewTaskTitle] = React.useState("");
  const [newTaskPriority, setNewTaskPriority] = React.useState<TaskPriority>("medium");
  const [newTaskStartTime, setNewTaskStartTime] = React.useState("");
  const [newTaskRecurring, setNewTaskRecurring] = React.useState(false);

  // Añadir calendario
  const [isAddingCalendar, setIsAddingCalendar] = React.useState(false);
  const [newCalendarName, setNewCalendarName] = React.useState("");
  const [isPendingCalendar, setIsPendingCalendar] = React.useState(false);

  const week = React.useMemo(() => weekDates(today), [today]);
  const month = React.useMemo(() => {
    const d = parseIsoDate(today);
    const year = d.getFullYear();
    const monthIndex = d.getMonth();
    const name = d.toLocaleString("es-ES", { month: "long", year: "numeric" });
    return {
      dates: monthDates(year, monthIndex),
      offset: mondayOffset(year, monthIndex),
      name: name.charAt(0).toUpperCase() + name.slice(1),
    };
  }, [today]);

  const viewCalendars = React.useMemo(
    () => [{ id: "all", name: "Todos los Calendarios", color: "bg-white text-zinc-950" }, ...calendars],
    [calendars]
  );

  const tasksOn = React.useCallback(
    (date: string) =>
      occurrences(date).filter((t) => selectedCalendar === "all" || t.calendarId === selectedCalendar),
    [occurrences, selectedCalendar]
  );

  const dayTasks = tasksOn(selectedDate);
  const selectedLabel = parseIsoDate(selectedDate).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
  });

  const handleToggleTask = (task: (typeof dayTasks)[number]) => {
    if (!task.completed) playTaskCompletedSound();
    toggle(task);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;

    setNewTaskTitle("");
    setNewTaskStartTime("");
    const created = await addTask({
      title,
      recurring: newTaskRecurring,
      date: newTaskRecurring ? undefined : selectedDate,
      daysOfWeek: newTaskRecurring ? [weekDayOf(selectedDate)] : undefined,
      priority: newTaskPriority,
      startTime: newTaskStartTime || undefined,
      calendarId: selectedCalendar !== "all" ? selectedCalendar : undefined,
      tag: "Enfoque",
    });
    // Si falló, se devuelve el texto para no perder lo que se escribió.
    if (!created) setNewTaskTitle(title);
  };

  const handleAddCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCalendarName.trim()) return;

    setIsPendingCalendar(true);
    const color = CALENDAR_COLORS[calendars.length % CALENDAR_COLORS.length];
    const created = await addCalendar(newCalendarName.trim(), color);
    setIsPendingCalendar(false);
    if (created) {
      setNewCalendarName("");
      setIsAddingCalendar(false);
    }
  };

  return (
    <div className={CARD_CLASS}>
      <div>
        {/* Header con Switch Semana / Mes */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <CalendarIcon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Organizador Inteligente</h2>
              <p className="text-xs text-zinc-400">
                {viewMode === "week" ? "Semana en curso" : `Calendario del Mes • ${month.name}`}
              </p>
            </div>
          </div>

          <div className="flex items-center bg-zinc-950/80 p-1 rounded-xl border border-white/10">
            {(["week", "month"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  viewMode === mode ? "bg-violet-600 text-white shadow-sm" : "text-zinc-400 hover:text-white"
                }`}
              >
                {mode === "week" ? "Semana" : "Ver Mes"}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs Horizontales de Calendarios */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-2 scrollbar-none border-b border-white/[0.06]">
          {viewCalendars.map((cal) => (
            <button
              key={cal.id}
              onClick={() => setSelectedCalendar(cal.id)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all whitespace-nowrap cursor-pointer ${
                selectedCalendar === cal.id
                  ? cal.color + " shadow-md"
                  : "bg-zinc-900/50 text-zinc-400 border border-white/[0.05] hover:bg-zinc-800"
              }`}
            >
              {cal.name}
            </button>
          ))}

          {isAddingCalendar ? (
            <form onSubmit={handleAddCalendar} className="flex items-center gap-1 min-w-[150px] shrink-0">
              <input
                autoFocus
                type="text"
                placeholder="Nombre..."
                maxLength={60}
                value={newCalendarName}
                onChange={(e) => setNewCalendarName(e.target.value)}
                className="bg-zinc-900 border border-zinc-700/80 rounded-full px-3 py-1 text-xs text-white focus:outline-none focus:border-violet-500 w-24"
                disabled={isPendingCalendar}
              />
              <button
                type="submit"
                disabled={isPendingCalendar}
                className="bg-violet-600 text-white rounded-full p-1.5 hover:bg-violet-500 transition-colors"
              >
                {isPendingCalendar ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              </button>
              <button
                type="button"
                onClick={() => setIsAddingCalendar(false)}
                className="bg-zinc-800 text-zinc-400 rounded-full p-1.5 hover:text-white transition-colors"
                disabled={isPendingCalendar}
              >
                <X className="h-3 w-3" />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setIsAddingCalendar(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full border border-dashed border-white/20 text-zinc-400 hover:text-white hover:border-white/40 transition-all whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Nuevo
            </button>
          )}
        </div>

        {viewMode === "week" ? (
          /* 1. VISTA SEMANA: días reales de la semana en curso */
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mb-4">
            {week.map((date, i) => {
              const isSelected = selectedDate === date;
              const isToday = date === today;
              const tasksForDay = tasksOn(date);
              const completedCount = tasksForDay.filter((t) => t.completed).length;

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  className={`flex-1 min-w-[76px] sm:min-w-[88px] py-2.5 px-2 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between ${
                    isSelected
                      ? "bg-violet-600/20 border-violet-500 text-white shadow-lg shadow-violet-500/10 ring-1 ring-violet-500"
                      : "bg-zinc-950/50 border-white/[0.06] text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 w-full">
                    <span className="text-[11px] uppercase tracking-wider font-semibold">{SHORT_NAMES[i]}</span>
                    {isToday && (
                      <span className="px-1.5 py-0.5 text-[8px] font-black bg-emerald-400 text-zinc-950 rounded-md tracking-wider leading-none">
                        HOY
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-lg sm:text-xl font-extrabold block my-0.5 ${
                      isToday ? "text-emerald-400" : isSelected ? "text-white" : "text-zinc-200"
                    }`}
                  >
                    {Number(date.slice(8, 10))}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {tasksForDay.length > 0 ? `${completedCount}/${tasksForDay.length}` : "—"}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          /* 2. VISTA MES: fechas reales del mes en curso */
          <div className="space-y-2 mb-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold text-zinc-500 pb-1">
              {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: month.offset }).map((_, i) => (
                <div key={`empty-${i}`} className="h-12 border border-transparent" />
              ))}
              {month.dates.map((date) => {
                const isToday = date === today;
                const isSelected = selectedDate === date;
                const count = tasksOn(date).length;
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    className={`h-12 rounded-xl border flex flex-col items-center justify-between p-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-violet-600/20 border-violet-500 text-white"
                        : isToday
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold ring-1 ring-emerald-500/30"
                          : "bg-zinc-950/40 border-white/[0.04] text-zinc-400 hover:bg-zinc-800/40"
                    }`}
                  >
                    <span className="text-xs">{Number(date.slice(8, 10))}</span>
                    <div className="flex gap-0.5">
                      {count > 0 && <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tareas del día seleccionado (en ambas vistas) */}
        <div className="rounded-2xl bg-zinc-950/60 border border-white/[0.06] p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400 border-b border-white/[0.06] pb-2">
            <span className="font-semibold text-zinc-300 flex items-center gap-1.5 capitalize">
              <ListTodo className="h-3.5 w-3.5 text-violet-400" />
              Tareas para el {selectedLabel}
              {selectedDate === today && " (hoy)"}
            </span>
            <span>{dayTasks.length} planificadas</span>
          </div>

          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {dayTasks.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500">
                No hay tareas para este día. Escribí abajo para añadir una.
              </div>
            ) : (
              dayTasks.map((task) => (
                <div
                  key={`${task.id}|${task.occurrenceDate}`}
                  className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    task.completed
                      ? "bg-zinc-900/40 border-white/[0.03] opacity-60"
                      : "bg-zinc-900/80 border-white/[0.06] hover:border-violet-500/40"
                  } ${isTempId(task.id) ? "opacity-60 pointer-events-none" : ""}`}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleTask(task)}
                      className="cursor-pointer text-zinc-500 hover:text-violet-400 transition-colors shrink-0"
                      aria-label={task.completed ? "Marcar como pendiente" : "Marcar como completada"}
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
                    {task.recurring && (
                      <span title="Se repite cada semana">
                        <Repeat className="h-3 w-3 text-violet-300 shrink-0" />
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {task.startTime && (
                      <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded-md border border-white/[0.05]">
                        {task.startTime} {task.endTime ? `- ${task.endTime}` : ""}
                      </span>
                    )}
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase hidden sm:inline-flex ${PRIORITY_BADGES[task.priority]}`}
                    >
                      {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Media" : "Baja"}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-zinc-600 hover:text-rose-400 transition-opacity"
                      aria-label="Eliminar tarea"
                      title={task.recurring ? "Elimina la tarea de todas las semanas" : "Eliminar tarea"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Formulario Inline rápido */}
          <form onSubmit={handleAddTask} className="pt-2 flex flex-col sm:flex-row items-center gap-2">
            <input
              type="text"
              placeholder="+ Nueva tarea o evento..."
              maxLength={200}
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="flex-1 w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
            />

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="time"
                value={newTaskStartTime}
                onChange={(e) => setNewTaskStartTime(e.target.value)}
                className="bg-zinc-900 border border-zinc-700/80 rounded-xl px-2 py-2 text-xs text-zinc-300 focus:outline-none focus:border-violet-500 w-24"
              />
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                className="bg-zinc-900 border border-zinc-700/80 rounded-xl px-2 py-2 text-xs text-zinc-300 focus:outline-none focus:border-violet-500"
              >
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
              <button
                type="button"
                onClick={() => setNewTaskRecurring((v) => !v)}
                aria-pressed={newTaskRecurring}
                title="Repetir todas las semanas este mismo día"
                className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                  newTaskRecurring
                    ? "bg-violet-600/30 border-violet-500 text-violet-200"
                    : "bg-zinc-900 border-zinc-700/80 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Repeat className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              type="submit"
              className="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0"
              aria-label="Agregar tarea"
            >
              <Plus className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
