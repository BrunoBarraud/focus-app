"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SESSION_EXPIRED, dbFail, ok, parse, requireUser } from "@/lib/action-helpers";
import { getProfile } from "@/lib/data";
import type { ActionResult } from "@/lib/types";
import { profileInput, ritualInput, timezone } from "@/lib/validation";

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
  ActionResult<{ fullName: string; email: string; birthDate: string; targetAge: number }>
> {
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;
  try {
    const profile = await getProfile();
    const meta = session.user.user_metadata ?? {};
    return ok({
      fullName: typeof meta.full_name === "string" ? meta.full_name : "",
      email: session.user.email ?? "",
      birthDate: profile.birthDate,
      targetAge: profile.targetAge,
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
  const { fullName, birthDate, targetAge, timezone: tz } = parsed.data;

  if (fullName !== undefined) {
    const { error } = await session.supabase.auth.updateUser({ data: { full_name: fullName } });
    if (error) return dbFail("actualizar tu nombre", error);
  }

  const { error } = await session.supabase
    .from("user_settings")
    .update({
      ...(birthDate !== undefined && { birth_date: birthDate }),
      ...(targetAge !== undefined && { target_age: targetAge }),
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
