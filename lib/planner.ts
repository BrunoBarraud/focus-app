import { weekDayOf } from "./dates";
import type { PlannerEvent, PlannerOccurrence } from "./types";

export function completionKey(eventId: string, isoDate: string): string {
  return `${eventId}|${isoDate}`;
}

export function occursOn(event: PlannerEvent, isoDate: string): boolean {
  if (!event.recurring) return event.date === isoDate;
  return event.daysOfWeek.includes(weekDayOf(isoDate));
}

function byStartTime(a: PlannerOccurrence, b: PlannerOccurrence): number {
  if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
  if (a.startTime) return -1;
  if (b.startTime) return 1;
  return a.title.localeCompare(b.title);
}

/** Ocurrencias de un día, ordenadas por hora. */
export function occurrencesOn(
  events: PlannerEvent[],
  completions: ReadonlySet<string>,
  isoDate: string
): PlannerOccurrence[] {
  return events
    .filter((e) => occursOn(e, isoDate))
    .map((e) => ({
      ...e,
      occurrenceDate: isoDate,
      completed: completions.has(completionKey(e.id, isoDate)),
    }))
    .sort(byStartTime);
}
