"use client";

import * as React from "react";
import {
  addCalendarAction,
  addEventAction,
  deleteCalendarAction,
  deleteEventAction,
  getPlannerRangeAction,
  setCalendarHiddenAction,
  setOccurrenceCompletionAction,
  updateCalendarAction,
  updateEventAction,
} from "@/app/actions/planner";
import { useToast } from "@/components/ui/toast";
import { useServerState } from "@/lib/client-hooks";
import { inputToEvent } from "@/lib/event-input";
import { completionKey, occurrencesInRange } from "@/lib/recurrence";
import type { Calendar, PlannerData, PlannerEvent, PlannerOccurrence } from "@/lib/types";
import type { CalendarInput, EventInput } from "@/lib/validation";

const TEMP_PREFIX = "temp-";
export const isTempId = (id: string) => id.startsWith(TEMP_PREFIX);

/** Rango cuyos completados ya se cargaron (el servidor manda ±45 días de hoy). */
interface LoadedRange {
  from: string;
  to: string;
}

/**
 * Estado del calendario compartido por la página del planificador y el panel
 * del inicio: eventos, calendarios, completados y todas las mutaciones con
 * actualización optimista.
 */
export function useCalendar(initialData: PlannerData, initialRange: LoadedRange) {
  const toast = useToast();
  const [events, setEvents] = useServerState<PlannerEvent[]>(initialData.events);
  const [calendars, setCalendars] = useServerState<Calendar[]>(initialData.calendars);
  // Completados: los del servidor (±45 días) más los de los rangos que se van
  // navegando. Cuando el servidor revalida, se suman los nuevos.
  const [completions, setCompletions] = React.useState(() => new Set(initialData.completions));
  const [lastServerCompletions, setLastServerCompletions] = React.useState(initialData.completions);
  if (initialData.completions !== lastServerCompletions) {
    setLastServerCompletions(initialData.completions);
    setCompletions((prev) => new Set([...prev, ...initialData.completions]));
  }

  const loaded = React.useRef<LoadedRange[]>([initialRange]);
  const pending = React.useRef(new Set<string>());

  const visibleCalendarIds = React.useMemo(
    () => new Set(calendars.filter((c) => !c.hidden).map((c) => c.id)),
    [calendars]
  );
  const calendarById = React.useMemo(() => new Map(calendars.map((c) => [c.id, c])), [calendars]);

  /** Ocurrencias de los calendarios visibles en [from, to]. */
  const occurrences = React.useCallback(
    (from: string, to: string, options?: { includeHidden?: boolean }): PlannerOccurrence[] =>
      occurrencesInRange(
        options?.includeHidden ? events : events.filter((e) => visibleCalendarIds.has(e.calendarId)),
        completions,
        from,
        to
      ),
    [events, completions, visibleCalendarIds]
  );

  /** Trae los completados de un rango que todavía no se cargó (navegar a diciembre, etc.). */
  const ensureRange = React.useCallback(
    async (from: string, to: string) => {
      const covered = loaded.current.some((r) => r.from <= from && r.to >= to);
      const key = `${from}|${to}`;
      if (covered || pending.current.has(key)) return;
      pending.current.add(key);
      const res = await getPlannerRangeAction(from, to).catch(() => null);
      pending.current.delete(key);
      if (!res?.ok) return; // se reintenta la próxima vez que se pida
      loaded.current.push({ from, to });
      setCompletions((prev) => new Set([...prev, ...res.data.completions]));
    },
    []
  );

  const toggleCompletion = async (occ: PlannerOccurrence) => {
    if (isTempId(occ.id)) return;
    const key = completionKey(occ.id, occ.occurrenceDate);
    const next = !occ.completed;
    const apply = (done: boolean) =>
      setCompletions((prev) => {
        const copy = new Set(prev);
        if (done) copy.add(key);
        else copy.delete(key);
        return copy;
      });
    apply(next);
    const res = await setOccurrenceCompletionAction(occ.id, occ.occurrenceDate, next).catch(() => null);
    if (!res?.ok) {
      apply(!next);
      toast.error(res?.error ?? "Sin conexión. Probá de nuevo.");
    }
  };

  const firstCalendarId = calendars.find((c) => !c.hidden)?.id ?? calendars[0]?.id ?? "";

  const addEvent = async (input: EventInput): Promise<PlannerEvent | null> => {
    const tempId = `${TEMP_PREFIX}${crypto.randomUUID()}`;
    setEvents((prev) => [...prev, inputToEvent(input, tempId, firstCalendarId)]);
    const res = await addEventAction(input).catch(() => null);
    if (res?.ok) {
      setEvents((prev) => prev.map((e) => (e.id === tempId ? res.data : e)));
      return res.data;
    }
    setEvents((prev) => prev.filter((e) => e.id !== tempId));
    toast.error(res?.error ?? "Sin conexión. Probá de nuevo.");
    return null;
  };

  const updateEvent = async (eventId: string, input: EventInput): Promise<boolean> => {
    const previous = events.find((e) => e.id === eventId);
    if (!previous || isTempId(eventId)) return false;
    setEvents((prev) => prev.map((e) => (e.id === eventId ? inputToEvent(input, eventId, previous.calendarId) : e)));
    const res = await updateEventAction(eventId, input).catch(() => null);
    if (res?.ok) {
      setEvents((prev) => prev.map((e) => (e.id === eventId ? res.data : e)));
      return true;
    }
    setEvents((prev) => prev.map((e) => (e.id === eventId ? previous : e)));
    toast.error(res?.error ?? "Sin conexión. Probá de nuevo.");
    return false;
  };

  const deleteEvent = async (eventId: string): Promise<boolean> => {
    const index = events.findIndex((e) => e.id === eventId);
    if (index === -1 || isTempId(eventId)) return false;
    const removed = events[index];
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    const res = await deleteEventAction(eventId).catch(() => null);
    if (res?.ok) return true;
    setEvents((prev) => {
      const copy = [...prev];
      copy.splice(Math.min(index, copy.length), 0, removed);
      return copy;
    });
    toast.error(res?.error ?? "Sin conexión. Probá de nuevo.");
    return false;
  };

  const addCalendar = async (input: CalendarInput): Promise<Calendar | null> => {
    const res = await addCalendarAction(input).catch(() => null);
    if (!res?.ok) {
      toast.error(res?.error ?? "Sin conexión. Probá de nuevo.");
      return null;
    }
    setCalendars((prev) => [...prev, res.data]);
    return res.data;
  };

  const updateCalendar = async (calendarId: string, input: CalendarInput): Promise<boolean> => {
    const res = await updateCalendarAction(calendarId, input).catch(() => null);
    if (!res?.ok) {
      toast.error(res?.error ?? "Sin conexión. Probá de nuevo.");
      return false;
    }
    setCalendars((prev) => prev.map((c) => (c.id === calendarId ? { ...res.data, position: c.position } : c)));
    return true;
  };

  const setCalendarHidden = async (calendarId: string, hidden: boolean) => {
    setCalendars((prev) => prev.map((c) => (c.id === calendarId ? { ...c, hidden } : c)));
    const res = await setCalendarHiddenAction(calendarId, hidden).catch(() => null);
    if (!res?.ok) {
      setCalendars((prev) => prev.map((c) => (c.id === calendarId ? { ...c, hidden: !hidden } : c)));
      toast.error(res?.error ?? "Sin conexión. Probá de nuevo.");
    }
  };

  const deleteCalendar = async (calendarId: string): Promise<boolean> => {
    const res = await deleteCalendarAction(calendarId).catch(() => null);
    if (!res?.ok) {
      toast.error(res?.error ?? "Sin conexión. Probá de nuevo.");
      return false;
    }
    setCalendars((prev) => prev.filter((c) => c.id !== calendarId));
    setEvents((prev) => prev.filter((e) => e.calendarId !== calendarId));
    return true;
  };

  return {
    events,
    calendars,
    calendarById,
    firstCalendarId,
    occurrences,
    ensureRange,
    toggleCompletion,
    addEvent,
    updateEvent,
    deleteEvent,
    addCalendar,
    updateCalendar,
    setCalendarHidden,
    deleteCalendar,
  };
}

export type CalendarState = ReturnType<typeof useCalendar>;
