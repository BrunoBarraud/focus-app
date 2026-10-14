"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SESSION_EXPIRED, dbFail, fail, ok, parse, requireUser } from "@/lib/action-helpers";
import { isAdminUser, toViewer } from "@/lib/auth";
import { getFeedbacks } from "@/lib/data";
import { mapFeedback } from "@/lib/mappers";
import type { ActionResult, SupportFeedback, SupportFeedbackStatus } from "@/lib/types";
import { feedbackInput, feedbackStatus, uuid } from "@/lib/validation";

const NOT_ADMIN = fail("No tenés permisos de administrador.");

export async function createFeedbackAction(
  input: z.input<typeof feedbackInput>
): Promise<ActionResult<SupportFeedback>> {
  const parsed = parse(feedbackInput, input);
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;
  const viewer = toViewer(session.user);

  const { data, error } = await session.supabase
    .from("support_feedback")
    .insert({
      user_id: viewer.id,
      user_email: viewer.email,
      user_name: viewer.fullName,
      type: parsed.data.type,
      title: parsed.data.title,
      description: parsed.data.description,
      rating: parsed.data.rating ?? null,
      priority: parsed.data.priority ?? "medium",
      status: "pending",
    })
    .select("*")
    .single();
  // Antes, si fallaba, se devolvía un éxito simulado ("Guardado localmente")
  // y el reporte se perdía. Ahora el usuario se entera.
  if (error) return dbFail("enviar tu mensaje", error);

  revalidatePath("/soporte");
  return ok(mapFeedback(data));
}

export async function getFeedbacksAction(): Promise<ActionResult<SupportFeedback[]>> {
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;
  try {
    return ok(await getFeedbacks());
  } catch (err) {
    return dbFail("cargar los tickets", err instanceof Error ? err : { message: String(err) });
  }
}

export async function updateFeedbackStatusAction(
  feedbackId: string,
  newStatus: SupportFeedbackStatus,
  adminResponse?: string
): Promise<ActionResult> {
  const parsed = parse(
    z.object({ feedbackId: uuid, status: feedbackStatus, response: z.string().trim().max(5000).optional() }),
    { feedbackId, status: newStatus, response: adminResponse }
  );
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;
  if (!isAdminUser(session.user)) return NOT_ADMIN;

  const { data, error } = await session.supabase
    .from("support_feedback")
    .update({
      status: parsed.data.status,
      ...(parsed.data.response ? { admin_response: parsed.data.response } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.feedbackId)
    .select("id");
  if (error) return dbFail("actualizar el ticket", error);
  // RLS filtra en silencio: 0 filas = no autorizado o inexistente.
  if (!data.length) return fail("El ticket no existe o no tenés permisos sobre él.");

  revalidatePath("/soporte");
  return ok();
}

export async function deleteFeedbackAction(feedbackId: string): Promise<ActionResult> {
  const parsed = parse(uuid, feedbackId);
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;
  if (!isAdminUser(session.user)) return NOT_ADMIN;

  const { data, error } = await session.supabase
    .from("support_feedback")
    .delete()
    .eq("id", parsed.data)
    .select("id");
  if (error) return dbFail("eliminar el ticket", error);
  if (!data.length) return fail("El ticket no existe o no tenés permisos sobre él.");

  revalidatePath("/soporte");
  return ok();
}
