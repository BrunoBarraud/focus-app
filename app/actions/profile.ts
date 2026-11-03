"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SESSION_EXPIRED, dbFail, ok, parse, requireUser } from "@/lib/action-helpers";
import { getProfile } from "@/lib/data";
import type { ActionResult, StreakInfo } from "@/lib/types";
import { inactivityHours, profileInput, ritualInput, timezone } from "@/lib/validation";

// Solo se escriben columnas permitidas explícitamente: antes se hacía
// `...data` con el input del cliente y se podía escribir cualquier columna
// (incluida `role`).

export async function updateMorningRitualAction(input: z.input<typeof ritualInput>): Promise<ActionResult> {
  const parsed = parse(ritualInput, input);
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;

  const { mission, pillar, frog, energyLevel } = parsed.data;
  const { error } = await session.supabase
    .from("user_settings")
    .update({
      ...(mission !== undefined && { daily_mission: mission }),
      ...(pillar !== undefined && { daily_pillar: pillar }),
      ...(frog !== undefined && { daily_frog: frog }),
      ...(energyLevel !== undefined && { energy_level: energyLevel }),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", session.user.id);
  if (error) return dbFail("guardar tus prioridades", error);

  revalidatePath("/dashboard");
  return ok();
}

export async function getProfileAction(): Promise<
  ActionResult<{ fullName: string; email: string; timezone: string | null }>
> {
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;
  try {
    const profile = await getProfile();
    const meta = session.user.user_metadata ?? {};
    return ok({
      fullName: typeof meta.full_name === "string" ? meta.full_name : "",
      email: session.user.email ?? "",
      timezone: profile.timezone,
    });
  } catch (err) {
    return dbFail("cargar tu perfil", err instanceof Error ? err : { message: String(err) });
  }
}

export async function updateProfileAction(input: z.input<typeof profileInput>): Promise<ActionResult> {
  const parsed = parse(profileInput, input);
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;
  const { fullName, timezone: tz } = parsed.data;

  if (fullName !== undefined) {
    const { error } = await session.supabase.auth.updateUser({ data: { full_name: fullName } });
    if (error) return dbFail("actualizar tu nombre", error);
  }

  const { error } = await session.supabase
    .from("user_settings")
    .update({
      ...(tz !== undefined && { timezone: tz }),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", session.user.id);
  if (error) return dbFail("actualizar tu perfil", error);

  revalidatePath("/", "layout");
  return ok();
}

/**
 * Sincroniza la zona horaria del navegador. Los recordatorios se calculan con
 * ella, así que tiene que reflejar dónde está el usuario realmente.
 */
export async function syncTimezoneAction(tz: string): Promise<ActionResult> {
  const parsed = parse(timezone, tz);
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;

  const { error } = await session.supabase
    .from("user_settings")
    .update({ timezone: parsed.data })
    .eq("user_id", session.user.id)
    .neq("timezone", parsed.data);
  if (error) return dbFail("guardar tu zona horaria", error);
  return ok();
}

/**
 * Registra que el usuario está usando la app (al abrirla y cada tanto mientras
 * la tiene en pantalla) y devuelve su racha de días seguidos.
 */
export async function touchActivityAction(): Promise<ActionResult<StreakInfo>> {
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;

  const { data, error } = await session.supabase.rpc("touch_activity");
  if (error) return dbFail("registrar tu actividad", error);
  const row = data?.[0];
  return ok({ current: row?.current_streak ?? 0, best: row?.best_streak ?? 0 });
}

/** Cada cuántas horas avisar si no se usa la app (1, 2, 5, 7 o 12). null = no avisar. */
export async function setInactivityReminderAction(hours: number | null): Promise<ActionResult> {
  const parsed = parse(inactivityHours, hours);
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;

  const { error } = await session.supabase
    .from("user_settings")
    .update({ inactivity_reminder_hours: parsed.data, updated_at: new Date().toISOString() })
    .eq("user_id", session.user.id);
  if (error) return dbFail("guardar el recordatorio", error);
  return ok();
}
