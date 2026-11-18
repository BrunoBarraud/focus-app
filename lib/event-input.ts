import type { EventInput } from "./validation";
import type { PlannerEvent } from "./types";

// Conversión entre el evento guardado y el input del editor/servidor.

export function eventToInput(event: PlannerEvent): EventInput {
  return {
    calendarId: event.calendarId,
    title: event.title,
    description: event.description,
    kind: event.kind,
    allDay: event.allDay,
    startDate: event.startDate,
    endDate: event.endDate,
    startTime: event.startTime,
    endTime: event.endTime,
    recurrence: event.recurrence ?? null,
    reminders: event.reminders ?? null,
    location: event.location,
    url: event.url,
    color: event.color ?? null,
    priority: event.priority,
    estimatedMinutes: event.estimatedMinutes,
    tag: event.tag === "General" ? undefined : event.tag,
  };
}

/** Evento provisorio (actualización optimista) a partir del input. */
export function inputToEvent(input: EventInput, id: string, fallbackCalendarId: string): PlannerEvent {
  const timed = !input.allDay;
  return {
    id,
    calendarId: input.calendarId ?? fallbackCalendarId,
    title: input.title.trim(),
    description: input.description || undefined,
    kind: input.kind,
    allDay: input.allDay,
    startDate: input.startDate,
    endDate: input.endDate && input.endDate > input.startDate ? input.endDate : undefined,
    startTime: timed ? input.startTime : undefined,
    endTime: timed ? input.endTime : undefined,
    recurrence: input.recurrence ?? undefined,
    reminders: input.reminders ?? undefined,
    location: input.location || undefined,
    url: input.url || undefined,
    color: input.color ?? undefined,
    priority: input.priority,
    estimatedMinutes: input.estimatedMinutes,
    tag: input.tag || "General",
  };
}
