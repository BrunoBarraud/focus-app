"use server";

import { z } from "zod";
import { SESSION_EXPIRED, dbFail, ok, parse, requireUser } from "@/lib/action-helpers";
import { getNotifications } from "@/lib/data";
import type { ActionResult, AppNotification } from "@/lib/types";
import { pushSubscriptionInput, uuid } from "@/lib/validation";

/**
 * Guarda (o reasigna) la suscripción push de este navegador. El endpoint es
 * único: si otra cuenta lo había registrado en este dispositivo, pasa a ser del
 * usuario actual y el anterior deja de recibir avisos acá.
 */
export async function savePushSubscriptionAction(subscription: unknown): Promise<ActionResult> {
  const parsed = parse(pushSubscriptionInput, subscription);
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;

  const { error } = await session.supabase.rpc("register_push_subscription", {
    p_endpoint: parsed.data.endpoint,
    p_auth_key: parsed.data.keys.auth,
    p_p256dh_key: parsed.data.keys.p256dh,
  });
  if (error) return dbFail("activar las notificaciones", error);
  return ok();
}

export async function removePushSubscriptionAction(endpoint: string): Promise<ActionResult> {
  const parsed = parse(z.url(), endpoint);
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;

  const { error } = await session.supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", parsed.data)
    .eq("user_id", session.user.id);
  if (error) return dbFail("desactivar las notificaciones", error);
  return ok();
}

export async function getNotificationsAction(): Promise<ActionResult<AppNotification[]>> {
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;
  try {
    return ok(await getNotifications());
  } catch (err) {
    return dbFail("cargar las notificaciones", err instanceof Error ? err : { message: String(err) });
  }
}

export async function markNotificationsReadAction(ids: string[]): Promise<ActionResult> {
  const parsed = parse(z.array(uuid).min(1).max(100), ids);
  if (!parsed.ok) return parsed;
  const session = await requireUser();
  if (!session) return SESSION_EXPIRED;

  const { error } = await session.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", parsed.data)
    .eq("user_id", session.user.id)
    .is("read_at", null);
  if (error) return dbFail("marcar como leídas", error);
  return ok();
}
