"use client";

import * as React from "react";
import {
  addCalendarAction,
  addTaskAction,
  deleteTaskAction,
  getPlannerRangeAction,
  setTaskCompletionAction,
} from "@/app/actions/planner";
import { useToast } from "@/components/ui/toast";
import { completionKey, occurrencesOn } from "@/lib/planner";
import type { Calendar, PlannerData, PlannerEvent, PlannerOccurrence } from "@/lib/types";
import type { TaskInput } from "@/lib/validation";
import { useServerState } from "@/lib/client-hooks";

const TEMP_PREFIX = "temp-";
export const isTempId = (id: string) => id.startsWith(TEMP_PREFIX);

/**
 * Estado del planificador compartido por el dashboard y /planificador.
 * Los eventos se guardan una vez; las ocurrencias de cada día se calculan en el
 * cliente (puntuales por fecha, semanales por día de la semana) y el completado
 * es por ocurrencia: completar el lunes de esta semana no completa el próximo.
 */
export function usePlanner(initial: PlannerData) {
  const toast = useToast();
  // Revalidación del servidor -> reemplaza el estado local.
  const [events, setEvents] = useServerState<PlannerEvent[]>(initial.events);
  const initialCompletions = React.useMemo(() => new Set(initial.completions), [initial.completions]);
  const [completions, setCompletions] = useServerState<ReadonlySet<string>>(initialCompletions);
  const [calendars, setCalendars] = useServerState<Calendar[]>(initial.calendars);
  const loadedRanges = React.useRef<{ from: string; to: string }[]>([]);
  const inFlight = React.useRef(new Set<string>());

  const occurrences = React.useCallback(
    (isoDate: string): PlannerOccurrence[] => occurrencesOn(events, completions, isoDate),
    [events, completions]
  );

  const setCompletion = (key: string, completed: boolean) =>
    setCompletions((prev) => {
      const next = new Set(prev);
      if (completed) next.add(key);
      else next.delete(key);
      return next;
    });

  const toggle = async (occurrence: PlannerOccurrence) => {
    if (isTempId(occurrence.id)) return;
    const key = completionKey(occurrence.id, occurrence.occurrenceDate);
    if (inFlight.current.has(key)) return;
    const next = !occurrence.completed;

    inFlight.current.add(key);
    setCompletion(key, next);
    const res = await setTaskCompletionAction(occurrence.id, occurrence.occurrenceDate, next);
    inFlight.current.delete(key);
    if (!res.ok) {
      setCompletion(key, !next);
      toast.error(res.error);
    }
    return res.ok;
  };

  const addTask = async (input: TaskInput): Promise<boolean> => {
    const tempId = `${TEMP_PREFIX}${crypto.randomUUID()}`;
    const optimistic: PlannerEvent = {
      id: tempId,
      calendarId: input.calendarId ?? calendars[0]?.id ?? "",
      title: input.title.trim(),
      description: input.description,
      recurring: input.recurring,
      date: input.recurring ? undefined : input.date,
      daysOfWeek: input.daysOfWeek ?? [],
      startTime: input.startTime,
      priority: input.priority,
      estimatedMinutes: input.estimatedMinutes,
      tag: input.tag || "General",
    };
    setEvents((prev) => [...prev, optimistic]);

    const res = await addTaskAction(input);
    if (res.ok) {
      setEvents((prev) => prev.map((e) => (e.id === tempId ? res.data : e)));
      return true;
    }
    setEvents((prev) => prev.filter((e) => e.id !== tempId));
    toast.error(res.error);
    return false;
  };

  const deleteTask = async (eventId: string) => {
    if (isTempId(eventId)) return;
    const index = events.findIndex((e) => e.id === eventId);
    if (index === -1) return;
    const removed = events[index];
    setEvents((prev) => prev.filter((e) => e.id !== eventId));

    const res = await deleteTaskAction(eventId);
    if (!res.ok) {
      setEvents((prev) => {
        const copy = [...prev];
        copy.splice(Math.min(index, copy.length), 0, removed);
        return copy;
      });
      toast.error(res.error);
    }
  };

  const addCalendar = async (name: string, color: string): Promise<boolean> => {
    const res = await addCalendarAction(name, color);
    if (!res.ok) {
      toast.error(res.error);
      return false;
    }
    setCalendars((prev) => [...prev, { id: res.data.id, name, color }]);
    return true;
  };

  /** Trae los completados de un rango que todavía no se cargó (navegación de meses). */
  const ensureRange = React.useCallback(
    async (from: string, to: string) => {
      const covered = loadedRanges.current.some((r) => r.from <= from && r.to >= to);
      if (covered) return;
      const res = await getPlannerRangeAction(from, to);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      loadedRanges.current.push({ from, to });
      setCompletions((prev) => {
        const next = new Set(prev);
        res.data.completions.forEach((k) => next.add(k));
        return next;
      });
    },
    [toast, setCompletions]
  );

  return { events, calendars, occurrences, toggle, addTask, deleteTask, addCalendar, ensureRange };
}
