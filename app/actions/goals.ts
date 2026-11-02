"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SESSION_EXPIRED, dbFail, fail, ok, parse, requireUser } from "@/lib/action-helpers";
import { mapDream, mapGoal, progressOf } from "@/lib/mappers";
import type { ActionResult, Dream, Goal, GoalMilestone } from "@/lib/types";
import { dreamInput, dreamStatus, goalInput, uuid } from "@/lib/validation";

type Supabase = NonNullable<Awaited<ReturnType<typeof requireUser>>>["supabase"];

/** Recalcula y guarda el progreso de una meta a partir de sus hitos reales. */
async function recomputeProgress(
  supabase: Supabase,
  userId: string,
  goalId: string
): Promise<number | { ok: false; error: string }> {
  const { data: siblings, error } = await supabase
    .from("goal_milestones")
    .select("completed")
    .eq("goal_id", goalId);
  if (error) return dbFail("recalcular el progreso", error);

  const progress = progressOf(siblings);
  const { error: goalError } = await supabase
    .from("goals")
    .update({ progress })
    .eq("id", goalId)
    .eq("user_id", userId);
  if (goalError) return dbFail("guardar el progreso", goalError);
  return progress;
}

function revalidateGoals() {
  revalidatePath("/dashboard");
  revalidatePath("/objetivos");
}

// ------------------------------------------------------------------------------
// Metas e hitos
// ------------------------------------------------------------------------------

export async function addGoalAction(input: z.input<typeof goalInput>): Promise<ActionResult<Goal>> {
  const parsed = parse(goalInput, input);
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;
  const goal = parsed.data;

  const { data: created, error } = await session.supabase
    .from("goals")
    .insert({
      user_id: session.user.id,
      title: goal.title,
      type: goal.category === "professional" ? "profesional" : "personal",
      progress: 0,
      // Antes se mandaba "Fin de año" a una columna DATE y el insert fallaba.
      target_date: goal.targetDate ?? null,
      timeframe: goal.timeframe,
    })
    .select("id")
    .single();
  if (error) return dbFail("crear la meta", error);

  // Los hitos los escribe el usuario (al crear la meta o después). Ya no se
  // agregan hitos genéricos inventados.
  const titles = goal.milestones ?? [];
  if (titles.length > 0) {
    const { error: milestonesError } = await session.supabase.from("goal_milestones").insert(
      titles.map((title, position) => ({
        goal_id: created.id,
        user_id: session.user.id,
        title,
        position,
      }))
    );
    if (milestonesError) {
      // Se deshace para no dejar la meta a medias.
      await session.supabase.from("goals").delete().eq("id", created.id);
      return dbFail("crear los hitos de la meta", milestonesError);
    }
  }

  const { data: full, error: reloadError } = await session.supabase
    .from("goals")
    .select("*, goal_milestones(id, title, completed, position)")
    .eq("id", created.id)
    .single();
  if (reloadError) return dbFail("cargar la meta creada", reloadError);

  revalidateGoals();
  return ok(mapGoal(full));
}

export async function deleteGoalAction(goalId: string): Promise<ActionResult> {
  const parsed = parse(uuid, goalId);
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;

  const { error } = await session.supabase
    .from("goals")
    .delete()
    .eq("id", parsed.data)
    .eq("user_id", session.user.id);
  if (error) return dbFail("eliminar la meta", error);

  revalidateGoals();
  return ok();
}

/**
 * Marca un hito concreto (estado deseado, idempotente) y recalcula el progreso
 * de la meta a partir de los hitos reales.
 */
export async function setMilestoneAction(
  milestoneId: string,
  completed: boolean
): Promise<ActionResult<{ progress: number }>> {
  const parsed = parse(z.object({ milestoneId: uuid, completed: z.boolean() }), { milestoneId, completed });
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;

  const { data: milestone, error } = await session.supabase
    .from("goal_milestones")
    .update({ completed: parsed.data.completed })
    .eq("id", parsed.data.milestoneId)
    .eq("user_id", session.user.id)
    .select("goal_id")
    .maybeSingle();
  if (error) return dbFail("actualizar el hito", error);
  if (!milestone) return fail("El hito ya no existe.");

  const progress = await recomputeProgress(session.supabase, session.user.id, milestone.goal_id);
  if (typeof progress !== "number") return progress;

  revalidateGoals();
  return ok({ progress });
}

export async function addMilestoneAction(
  goalId: string,
  title: string
): Promise<ActionResult<{ milestone: GoalMilestone; progress: number }>> {
  const parsed = parse(z.object({ goalId: uuid, title: z.string().trim().min(1, "Escribí el hito.").max(200) }), {
    goalId,
    title,
  });
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;

  const { data: last, error: lastError } = await session.supabase
    .from("goal_milestones")
    .select("position")
    .eq("goal_id", parsed.data.goalId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) return dbFail("agregar el hito", lastError);

  // RLS exige que la meta sea del usuario (with check sobre goals).
  const { data, error } = await session.supabase
    .from("goal_milestones")
    .insert({
      goal_id: parsed.data.goalId,
      user_id: session.user.id,
      title: parsed.data.title,
      position: (last?.position ?? -1) + 1,
    })
    .select("id, title, completed")
    .single();
  if (error) return dbFail("agregar el hito", error);

  const progress = await recomputeProgress(session.supabase, session.user.id, parsed.data.goalId);
  if (typeof progress !== "number") return progress;

  revalidateGoals();
  return ok({ milestone: { id: data.id, title: data.title, completed: data.completed }, progress });
}

export async function deleteMilestoneAction(milestoneId: string): Promise<ActionResult<{ progress: number }>> {
  const parsed = parse(uuid, milestoneId);
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;

  const { data, error } = await session.supabase
    .from("goal_milestones")
    .delete()
    .eq("id", parsed.data)
    .eq("user_id", session.user.id)
    .select("goal_id")
    .maybeSingle();
  if (error) return dbFail("eliminar el hito", error);
  if (!data) return fail("El hito ya no existe.");

  const progress = await recomputeProgress(session.supabase, session.user.id, data.goal_id);
  if (typeof progress !== "number") return progress;

  revalidateGoals();
  return ok({ progress });
}

// ------------------------------------------------------------------------------
// Rueda de la vida
// ------------------------------------------------------------------------------

export async function updateWheelAreaAction(subject: string, score: number): Promise<ActionResult> {
  const parsed = parse(z.object({ subject: z.string().min(1).max(200), score: z.number().min(0).max(10) }), {
    subject,
    score,
  });
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;

  const { error } = await session.supabase
    .from("goals")
    .update({ score: parsed.data.score })
    .eq("user_id", session.user.id)
    .eq("type", "rueda")
    .eq("title", parsed.data.subject);
  if (error) return dbFail("guardar el puntaje", error);

  revalidatePath("/objetivos");
  return ok();
}

// ------------------------------------------------------------------------------
// Sueños
// ------------------------------------------------------------------------------

export async function addDreamAction(input: z.input<typeof dreamInput>): Promise<ActionResult<Dream>> {
  const parsed = parse(dreamInput, input);
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;

  const { data, error } = await session.supabase
    .from("dreams")
    .insert({
      user_id: session.user.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      category: parsed.data.category,
      status: "pending",
      target_year: parsed.data.targetYear ?? null,
    })
    .select("*")
    .single();
  if (error) return dbFail("guardar el sueño", error);

  revalidatePath("/objetivos");
  return ok(mapDream(data));
}

export async function setDreamStatusAction(dreamId: string, status: Dream["status"]): Promise<ActionResult> {
  const parsed = parse(z.object({ dreamId: uuid, status: dreamStatus }), { dreamId, status });
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;

  const { data, error } = await session.supabase
    .from("dreams")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.dreamId)
    .eq("user_id", session.user.id)
    .select("id");
  if (error) return dbFail("actualizar el sueño", error);
  if (!data.length) return fail("El sueño ya no existe.");

  revalidatePath("/objetivos");
  return ok();
}
