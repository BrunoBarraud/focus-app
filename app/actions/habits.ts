"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SESSION_EXPIRED, dbFail, ok, parse, requireUser } from "@/lib/action-helpers";
import type { ActionResult } from "@/lib/types";
import { habitInput, isoDate, uuid } from "@/lib/validation";

function revalidateHabits() {
  revalidatePath("/dashboard");
  revalidatePath("/habitos");
}

export async function addHabitAction(input: z.input<typeof habitInput>): Promise<ActionResult<{ id: string }>> {
  const parsed = parse(habitInput, input);
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;

  const { data, error } = await session.supabase
    .from("habits")
    .insert({
      user_id: session.user.id,
      title: parsed.data.name,
      category: parsed.data.category,
      monthly_target_days: parsed.data.monthlyTargetDays,
      color: parsed.data.color ?? "#10b981",
    })
    .select("id")
    .single();
  if (error) return dbFail("crear el hábito", error);

  revalidateHabits();
  return ok({ id: data.id });
}

export async function renameHabitAction(habitId: string, newTitle: string): Promise<ActionResult> {
  const parsed = parse(z.object({ habitId: uuid, title: z.string().trim().min(1).max(120) }), {
    habitId,
    title: newTitle,
  });
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;

  const { error } = await session.supabase
    .from("habits")
    .update({ title: parsed.data.title })
    .eq("id", parsed.data.habitId)
    .eq("user_id", session.user.id);
  if (error) return dbFail("renombrar el hábito", error);

  revalidateHabits();
  return ok();
}

export async function deleteHabitAction(habitId: string): Promise<ActionResult> {
  const parsed = parse(uuid, habitId);
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;

  const { error } = await session.supabase
    .from("habits")
    .delete()
    .eq("id", parsed.data)
    .eq("user_id", session.user.id);
  if (error) return dbFail("eliminar el hábito", error);

  revalidateHabits();
  return ok();
}

/**
 * Marca o desmarca un día. Recibe el ESTADO DESEADO (no un "toggle") y la fecha
 * local del usuario: es idempotente, así que reintentos o dobles clics no
 * pueden desincronizar la UI con la base.
 */
export async function setHabitDayAction(
  habitId: string,
  date: string,
  completed: boolean
): Promise<ActionResult> {
  const parsed = parse(z.object({ habitId: uuid, date: isoDate, completed: z.boolean() }), {
    habitId,
    date,
    completed,
  });
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;

  const { error } = parsed.data.completed
    ? await session.supabase
        .from("habit_logs")
        .upsert(
          { habit_id: parsed.data.habitId, date: parsed.data.date, completed: true },
          { onConflict: "habit_id,date" }
        )
    : await session.supabase
        .from("habit_logs")
        .delete()
        .eq("habit_id", parsed.data.habitId)
        .eq("date", parsed.data.date);
  if (error) return dbFail("registrar el hábito", error);

  revalidateHabits();
  return ok();
}
