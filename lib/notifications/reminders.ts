import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import webPush, { type WebPushError } from "web-push";
import type { Database, Tables } from "@/lib/database.types";
import { addDays, DEFAULT_TIMEZONE, isoDateInZone, isValidTimeZone, zonedTimeToUtc } from "@/lib/dates";
import { mapEvent } from "@/lib/mappers";
import { completionKey, occursOn } from "@/lib/planner";

type Admin = SupabaseClient<Database>;

/** Minutos antes del inicio en que se avisa. */
export const REMINDER_OFFSETS = [30, 15, 5] as const;
/** Ventana hacia adelante que se encola en cada corrida (> intervalo del cron). */
const LOOKAHEAD_MS = 35 * 60_000;
/** Tolerancia hacia atrás: si el cron se atrasó un poco, igual se encola. */
const GRACE_MS = 5 * 60_000;
const SEND_CONCURRENCY = 20;

// ------------------------------------------------------------------------------
// 1. ENCOLAR: eventos con hora -> filas en `notifications` (idempotente)
// ------------------------------------------------------------------------------

export async function enqueueReminders(supabase: Admin, now: Date): Promise<number> {
  const utcToday = now.toISOString().slice(0, 10);

  // Solo eventos con hora: semanales, o puntuales cerca de hoy (±1 día cubre
  // cualquier zona horaria).
  const { data: rows, error } = await supabase
    .from("calendar_events")
    .select("*")
    .not("start_time", "is", null)
    .or(`is_recurring.eq.true,and(date.gte.${addDays(utcToday, -1)},date.lte.${addDays(utcToday, 1)})`);
  if (error) throw new Error(`No se pudieron leer los eventos: ${error.message}`);
  if (!rows.length) return 0;

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const [settingsRes, completionsRes] = await Promise.all([
    supabase.from("user_settings").select("user_id, timezone").in("user_id", userIds),
    supabase
      .from("event_completions")
      .select("event_id, date")
      .in("event_id", rows.map((r) => r.id))
      .gte("date", addDays(utcToday, -1))
      .lte("date", addDays(utcToday, 1)),
  ]);
  if (settingsRes.error) throw new Error(settingsRes.error.message);
  if (completionsRes.error) throw new Error(completionsRes.error.message);

  const tzByUser = new Map(
    settingsRes.data.map((s) => [s.user_id, isValidTimeZone(s.timezone) ? s.timezone : DEFAULT_TIMEZONE])
  );
  const completed = new Set(completionsRes.data.map((c) => completionKey(c.event_id, c.date)));

  const toInsert: Database["public"]["Tables"]["notifications"]["Insert"][] = [];
  for (const row of rows) {
    const event = mapEvent(row);
    if (!event.startTime) continue;
    const tz = tzByUser.get(row.user_id) ?? DEFAULT_TIMEZONE;
    const localToday = isoDateInZone(now, tz);

    // Hoy y mañana (local): un evento a las 00:10 se avisa a las 23:40 del día anterior.
    for (const date of [localToday, addDays(localToday, 1)]) {
      if (!occursOn(event, date) || completed.has(completionKey(event.id, date))) continue;
      const start = zonedTimeToUtc(date, event.startTime, tz);

      for (const offset of REMINDER_OFFSETS) {
        const at = new Date(start.getTime() - offset * 60_000);
        const delta = at.getTime() - now.getTime();
        if (delta < -GRACE_MS || delta > LOOKAHEAD_MS) continue;
        toInsert.push({
          user_id: row.user_id,
          event_id: row.id,
          kind: `reminder_${offset}`,
          title: "Recordatorio de Focus",
          body: `"${event.title}" empieza en ${offset} minutos (${event.startTime}).`,
          url: "/dashboard",
          scheduled_for: at.toISOString(),
        });
      }
    }
  }

  if (!toInsert.length) return 0;
  // UNIQUE (event_id, kind, scheduled_for): correr el cron dos veces no duplica.
  const { error: insertError, count } = await supabase
    .from("notifications")
    .upsert(toInsert, { onConflict: "event_id,kind,scheduled_for", ignoreDuplicates: true, count: "exact" });
  if (insertError) throw new Error(`No se pudieron encolar recordatorios: ${insertError.message}`);
  return count ?? toInsert.length;
}

// ------------------------------------------------------------------------------
// 2. DESPACHAR: notificaciones vencidas -> Web Push (con reintentos)
// ------------------------------------------------------------------------------

function configureWebPush(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webPush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@focus.app", publicKey, privateKey);
  return true;
}

function isGone(err: unknown): boolean {
  const status = (err as WebPushError | undefined)?.statusCode;
  return status === 404 || status === 410;
}

async function inChunks<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
}

export interface DispatchResult {
  claimed: number;
  sent: number;
  retrying: number;
  failed: number;
}

export async function dispatchDueNotifications(supabase: Admin): Promise<DispatchResult> {
  const { data: due, error } = await supabase.rpc("claim_due_notifications", { batch_size: 200 });
  if (error) throw new Error(`No se pudieron reclamar notificaciones: ${error.message}`);
  const result: DispatchResult = { claimed: due.length, sent: 0, retrying: 0, failed: 0 };
  if (!due.length) return result;

  const pushEnabled = configureWebPush();
  if (!pushEnabled) console.warn("[cron] VAPID no configurado: solo se entregan notificaciones in-app.");

  const userIds = [...new Set(due.map((n) => n.user_id))];
  const { data: subs, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("*")
    .in("user_id", userIds);
  if (subsError) throw new Error(`No se pudieron leer las suscripciones: ${subsError.message}`);

  const subsByUser = new Map<string, Tables<"push_subscriptions">[]>();
  for (const sub of subs) subsByUser.set(sub.user_id, [...(subsByUser.get(sub.user_id) ?? []), sub]);

  await inChunks(due, SEND_CONCURRENCY, async (notification) => {
    const targets = pushEnabled ? (subsByUser.get(notification.user_id) ?? []) : [];
    const payload = JSON.stringify({
      id: notification.id,
      title: notification.title,
      body: notification.body,
      url: notification.url,
    });

    const outcomes = await Promise.allSettled(
      targets.map((sub) =>
        webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { auth: sub.auth_key, p256dh: sub.p256dh_key } },
          payload,
          { TTL: 15 * 60, urgency: "high" }
        )
      )
    );

    const gone: string[] = [];
    const errors: string[] = [];
    let delivered = 0;
    outcomes.forEach((outcome, i) => {
      if (outcome.status === "fulfilled") delivered++;
      else if (isGone(outcome.reason)) gone.push(targets[i].id);
      else errors.push(String((outcome.reason as Error)?.message ?? outcome.reason));
    });

    // Suscripciones vencidas: se borran para no reintentarlas nunca más.
    if (gone.length) await supabase.from("push_subscriptions").delete().in("id", gone);

    // Se considera entregada si llegó a algún dispositivo o si no hay a dónde
    // mandarla (queda igual visible en la campana in-app).
    const hasRetryableFailure = delivered === 0 && errors.length > 0;
    let update: Database["public"]["Tables"]["notifications"]["Update"];
    if (!hasRetryableFailure) {
      update = { status: "sent", sent_at: new Date().toISOString(), locked_at: null, last_error: null };
      result.sent++;
    } else if (notification.attempts >= 5) {
      update = { status: "failed", locked_at: null, last_error: errors.join(" | ").slice(0, 500) };
      result.failed++;
    } else {
      update = { status: "pending", locked_at: null, last_error: errors.join(" | ").slice(0, 500) };
      result.retrying++;
    }

    const { error: updateError } = await supabase.from("notifications").update(update).eq("id", notification.id);
    if (updateError) console.error("[cron] No se pudo actualizar la notificación", notification.id, updateError.message);
  });

  return result;
}
