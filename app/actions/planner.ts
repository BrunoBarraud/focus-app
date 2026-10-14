"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SESSION_EXPIRED, dbFail, fail, ok, parse, requireUser } from "@/lib/action-helpers";
import { getPlannerData } from "@/lib/data";
import { weekDayOf } from "@/lib/dates";
import { CALENDAR_COLORS } from "@/lib/calendar-colors";
import { mapEvent } from "@/lib/mappers";
import type { ActionResult, PlannerData, PlannerEvent } from "@/lib/types";
import { calendarInput, isoDate, taskInput, type TaskInput, uuid } from "@/lib/validation";

type Supabase = NonNullable<Awaited<ReturnType<typeof requireUser>>>["supabase"];

function revalidatePlanner() {
  revalidatePath("/dashboard");
  revalidatePath("/planificador");
}

/** Devuelve el calendario pedido si es del usuario, o el primero (creándolo si no hay). */
type CalendarResolution = { id: string } | { error: { message: string; code?: string } };

async function resolveCalendarId(
  supabase: Supabase,
  userId: string,
  requested?: string
): Promise<CalendarResolution> {
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
    .insert({ user_id: userId, name: "General", color: CALENDAR_COLORS[0] })
    .select("id")
    .single();
  if (createError) return { error: createError };
  return { id: created.id };
}

export async function addTaskAction(input: TaskInput): Promise<ActionResult<PlannerEvent>> {
  const parsed = parse(taskInput, input);
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;
  const task = parsed.data;

  const calendar = await resolveCalendarId(session.supabase, session.user.id, task.calendarId);
  if ("error" in calendar) return dbFail("preparar el calendario", calendar.error);

  const { data, error } = await session.supabase
    .from("calendar_events")
    .insert({
      user_id: session.user.id,
      calendar_id: calendar.id,
      title: task.title,
      description: task.description ?? null,
      is_recurring: task.recurring,
      date: task.recurring ? null : task.date!,
      days_of_week: task.recurring ? task.daysOfWeek! : [weekDayOf(task.date!)],
      start_time: task.startTime ?? null,
      end_time: task.endTime ?? null,
      priority: task.priority,
      estimated_minutes: task.estimatedMinutes ?? null,
      tag: task.tag || "General",
      status: "pending",
    })
    .select("*")
    .single();
  if (error) return dbFail("crear la tarea", error);

  revalidatePlanner();
  return ok(mapEvent(data));
}

/** Completa o descompleta UNA ocurrencia (fecha) de una tarea. Idempotente. */
export async function setTaskCompletionAction(
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

export async function deleteTaskAction(eventId: string): Promise<ActionResult> {
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
  if (error) return dbFail("eliminar la tarea", error);
  if (!data.length) return fail("La tarea ya no existe.");

  revalidatePlanner();
  return ok();
}

export async function addCalendarAction(name: string, color: string): Promise<ActionResult<{ id: string }>> {
  const parsed = parse(calendarInput, { name, color });
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;

  const safeColor = (CALENDAR_COLORS as readonly string[]).includes(parsed.data.color)
    ? parsed.data.color
    : CALENDAR_COLORS[0];
  const { data, error } = await session.supabase
    .from("calendars")
    .insert({ user_id: session.user.id, name: parsed.data.name, color: safeColor })
    .select("id")
    .single();
  if (error) return dbFail("crear el calendario", error);

  revalidatePlanner();
  return ok({ id: data.id });
}

/** Datos del planificador para otro rango (navegación de meses). */
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
