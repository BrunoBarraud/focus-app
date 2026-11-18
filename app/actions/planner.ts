"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SESSION_EXPIRED, dbFail, fail, ok, parse, requireUser } from "@/lib/action-helpers";
import { getPlannerData } from "@/lib/data";
import { mapCalendar, mapEvent } from "@/lib/mappers";
import { weekdayKey } from "@/lib/recurrence";
import type { ActionResult, Calendar, PlannerData, PlannerEvent } from "@/lib/types";
import {
  calendarInput,
  eventInput,
  isoDate,
  uuid,
  type CalendarInput,
  type EventInput,
} from "@/lib/validation";

type Supabase = NonNullable<Awaited<ReturnType<typeof requireUser>>>["supabase"];
type DbError = { message: string; code?: string };

function revalidatePlanner() {
  revalidatePath("/dashboard");
  revalidatePath("/planificador");
}

/** Igual que dbFail, pero avisa si falta correr la migración del calendario. */
function writeFail(action: string, error: DbError) {
  // 42703 = columna inexistente; PGRST204 = columna que PostgREST no conoce.
  if (error.code === "42703" || error.code === "PGRST204") {
    console.error(`[action] Error al ${action}:`, error.code, error.message);
    return fail(
      "Falta actualizar la base de datos: corré la migración 20261118120000_calendario_completo.sql en Supabase."
    );
  }
  return dbFail(action, error);
}

/** Devuelve el calendario pedido si es del usuario, o el primero (creándolo si no hay). */
type CalendarResolution = { id: string } | { error: DbError };

async function resolveCalendarId(supabase: Supabase, userId: string, requested?: string): Promise<CalendarResolution> {
  if (requested) {
    const { data, error } = await supabase
      .from("calendars")
      .select("id")
      .eq("id", requested)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return { error };
    if (data) return { id: data.id };
  }

  const { data: existing, error: listError } = await supabase
    .from("calendars")
    .select("id")
    .eq("user_id", userId)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (listError) return { error: listError };
  if (existing) return { id: existing.id };

  const { data: created, error: createError } = await supabase
    .from("calendars")
    .insert({ user_id: userId, name: "General", color: "violet" })
    .select("id")
    .single();
  if (createError) return { error: createError };
  return { id: created.id };
}

/** Columnas de calendar_events a partir del input validado (alta y edición). */
function eventFields(e: z.output<typeof eventInput>) {
  const timed = !e.allDay;
  return {
    title: e.title,
    description: e.description ?? null,
    kind: e.kind,
    all_day: e.allDay,
    start_date: e.startDate,
    end_date: e.endDate && e.endDate > e.startDate ? e.endDate : null,
    start_time: timed ? (e.startTime ?? null) : null,
    end_time: timed ? (e.endTime ?? null) : null,
    recurrence: e.recurrence ?? null,
    reminders: e.reminders ?? null,
    location: e.location ?? null,
    url: e.url ?? null,
    color: e.color ?? null,
    priority: e.priority,
    estimated_minutes: e.estimatedMinutes ?? null,
    tag: e.tag || "General",
    // Columnas del modelo anterior, mantenidas coherentes por compatibilidad.
    is_recurring: Boolean(e.recurrence),
    date: e.recurrence ? null : e.startDate,
    days_of_week: e.recurrence?.byWeekday?.length ? e.recurrence.byWeekday : [weekdayKey(e.startDate)],
  };
}

// ------------------------------------------------------------------------------
// Eventos
// ------------------------------------------------------------------------------

export async function addEventAction(input: EventInput): Promise<ActionResult<PlannerEvent>> {
  const parsed = parse(eventInput, input);
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;

  const calendar = await resolveCalendarId(session.supabase, session.user.id, parsed.data.calendarId);
  if ("error" in calendar) return dbFail("preparar el calendario", calendar.error);

  const { data, error } = await session.supabase
    .from("calendar_events")
    .insert({ user_id: session.user.id, calendar_id: calendar.id, status: "pending", ...eventFields(parsed.data) })
    .select("*")
    .single();
  if (error) return writeFail("crear el evento", error);

  revalidatePlanner();
  return ok(mapEvent(data));
}

export async function updateEventAction(eventId: string, input: EventInput): Promise<ActionResult<PlannerEvent>> {
  const id = parse(uuid, eventId);
  if (!id.ok) return id;
  const parsed = parse(eventInput, input);
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;

  const calendar = await resolveCalendarId(session.supabase, session.user.id, parsed.data.calendarId);
  if ("error" in calendar) return dbFail("preparar el calendario", calendar.error);

  const { data, error } = await session.supabase
    .from("calendar_events")
    .update({ calendar_id: calendar.id, ...eventFields(parsed.data) })
    .eq("id", id.data)
    .eq("user_id", session.user.id)
    .select("*")
    .maybeSingle();
  if (error) return writeFail("guardar los cambios", error);
  if (!data) return fail("El evento ya no existe.");

  revalidatePlanner();
  return ok(mapEvent(data));
}

export async function deleteEventAction(eventId: string): Promise<ActionResult> {
  const parsed = parse(uuid, eventId);
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;

  const { data, error } = await session.supabase
    .from("calendar_events")
    .delete()
    .eq("id", parsed.data)
    .eq("user_id", session.user.id)
    .select("id");
  if (error) return dbFail("eliminar el evento", error);
  if (!data.length) return fail("El evento ya no existe.");

  revalidatePlanner();
  return ok();
}

/** Completa o descompleta UNA ocurrencia (fecha) de una tarea. Idempotente. */
export async function setOccurrenceCompletionAction(
  eventId: string,
  date: string,
  completed: boolean
): Promise<ActionResult> {
  const parsed = parse(z.object({ eventId: uuid, date: isoDate, completed: z.boolean() }), {
    eventId,
    date,
    completed,
  });
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;

  const { error } = parsed.data.completed
    ? await session.supabase
        .from("event_completions")
        .upsert(
          { event_id: parsed.data.eventId, date: parsed.data.date, user_id: session.user.id },
          { onConflict: "event_id,date", ignoreDuplicates: true }
        )
    : await session.supabase
        .from("event_completions")
        .delete()
        .eq("event_id", parsed.data.eventId)
        .eq("date", parsed.data.date)
        .eq("user_id", session.user.id);
  if (error) return dbFail("actualizar la tarea", error);

  revalidatePlanner();
  return ok();
}

// ------------------------------------------------------------------------------
// Calendarios
// ------------------------------------------------------------------------------

function calendarFields(c: z.output<typeof calendarInput>) {
  return {
    name: c.name,
    color: c.color,
    ...(c.icon !== undefined && { icon: c.icon || null }),
    ...(c.hidden !== undefined && { hidden: c.hidden }),
    ...(c.defaultReminders !== undefined && { default_reminders: c.defaultReminders }),
    ...(c.useSlots !== undefined && { use_slots: c.useSlots }),
    ...(c.schedule && {
      slot_start: c.schedule.start,
      slot_minutes: c.schedule.slotMinutes,
      slot_gap_minutes: c.schedule.gapMinutes,
      day_end: c.schedule.end,
    }),
  };
}

export async function addCalendarAction(input: CalendarInput): Promise<ActionResult<Calendar>> {
  const parsed = parse(calendarInput, input);
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;

  const { count } = await session.supabase
    .from("calendars")
    .select("id", { count: "exact", head: true })
    .eq("user_id", session.user.id);

  const { data, error } = await session.supabase
    .from("calendars")
    .insert({ user_id: session.user.id, position: count ?? 0, ...calendarFields(parsed.data) })
    .select("*")
    .single();
  if (error) return writeFail("crear el calendario", error);

  revalidatePlanner();
  return ok(mapCalendar(data, count ?? 0));
}

export async function updateCalendarAction(calendarId: string, input: CalendarInput): Promise<ActionResult<Calendar>> {
  const id = parse(uuid, calendarId);
  if (!id.ok) return id;
  const parsed = parse(calendarInput, input);
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;

  const { data, error } = await session.supabase
    .from("calendars")
    .update(calendarFields(parsed.data))
    .eq("id", id.data)
    .eq("user_id", session.user.id)
    .select("*")
    .maybeSingle();
  if (error) return writeFail("guardar el calendario", error);
  if (!data) return fail("El calendario ya no existe.");

  revalidatePlanner();
  return ok(mapCalendar(data, data.position ?? 0));
}

/** Muestra u oculta un calendario en las vistas (sin tocar sus eventos). */
export async function setCalendarHiddenAction(calendarId: string, hidden: boolean): Promise<ActionResult> {
  const parsed = parse(z.object({ id: uuid, hidden: z.boolean() }), { id: calendarId, hidden });
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;

  const { error } = await session.supabase
    .from("calendars")
    .update({ hidden: parsed.data.hidden })
    .eq("id", parsed.data.id)
    .eq("user_id", session.user.id);
  if (error) return writeFail("actualizar el calendario", error);
  return ok();
}

/** Borra un calendario y TODOS sus eventos. No se puede borrar el último. */
export async function deleteCalendarAction(calendarId: string): Promise<ActionResult> {
  const parsed = parse(uuid, calendarId);
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;

  const { count, error: countError } = await session.supabase
    .from("calendars")
    .select("id", { count: "exact", head: true })
    .eq("user_id", session.user.id);
  if (countError) return dbFail("eliminar el calendario", countError);
  if ((count ?? 0) <= 1) return fail("Tenés que tener al menos un calendario.");

  const { data, error } = await session.supabase
    .from("calendars")
    .delete()
    .eq("id", parsed.data)
    .eq("user_id", session.user.id)
    .select("id");
  if (error) return dbFail("eliminar el calendario", error);
  if (!data.length) return fail("El calendario ya no existe.");

  revalidatePlanner();
  return ok();
}

/** Datos del planificador para otro rango (completados de los meses que se navegan). */
export async function getPlannerRangeAction(from: string, to: string): Promise<ActionResult<PlannerData>> {
  const parsed = parse(z.object({ from: isoDate, to: isoDate }), { from, to });
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;
  try {
    return ok(await getPlannerData(parsed.data));
  } catch (err) {
    return dbFail("cargar el planificador", err instanceof Error ? err : { message: String(err) });
  }
}
