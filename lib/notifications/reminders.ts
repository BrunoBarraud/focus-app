import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import webPush, { type WebPushError } from "web-push";
import type { Database, Tables } from "@/lib/database.types";
import { addDays, DEFAULT_TIMEZONE, isValidTimeZone } from "@/lib/dates";
import { mapCalendar, mapEvent } from "@/lib/mappers";
import { completionKey } from "@/lib/recurrence";
import { MAX_REMINDER_MINUTES } from "@/lib/reminder-options";
import { INACTIVITY_OPTIONS, isInactivityHours, planInactivityNudges } from "./inactivity";
import { effectiveReminders, planEventReminders } from "./plan-reminders";

type Admin = SupabaseClient<Database>;

const SEND_CONCURRENCY = 20;

// ------------------------------------------------------------------------------
// 1. ENCOLAR: recordatorios de eventos -> filas en `notifications` (idempotente)
// ------------------------------------------------------------------------------

export async function enqueueReminders(supabase: Admin, now: Date): Promise<number> {
  const utcToday = now.toISOString().slice(0, 10);
  // Un evento puntual puede avisar hasta 4 semanas antes: se leen los que
  // empiezan entre ayer y dentro de ~4 semanas, más todos los que se repiten.
  const horizon = addDays(utcToday, Math.ceil(MAX_REMINDER_MINUTES / 1440) + 2);
  const { data: rows, error } = await supabase
    .from("calendar_events")
    .select("*")
    .or(`recurrence.not.is.null,and(start_date.gte.${addDays(utcToday, -1)},start_date.lte.${horizon})`);
  if (error) throw new Error(`No se pudieron leer los eventos: ${error.message}`);
  if (!rows.length) return 0;

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const calendarIds = [...new Set(rows.map((r) => r.calendar_id))];
  const [settingsRes, completionsRes, calendarsRes] = await Promise.all([
    supabase.from("user_settings").select("user_id, timezone").in("user_id", userIds),
    supabase
      .from("event_completions")
      .select("event_id, date")
      .in("event_id", rows.map((r) => r.id))
      .gte("date", addDays(utcToday, -1))
      .lte("date", horizon),
    supabase.from("calendars").select("*").in("id", calendarIds),
  ]);
  if (settingsRes.error) throw new Error(settingsRes.error.message);
  if (completionsRes.error) throw new Error(completionsRes.error.message);
  if (calendarsRes.error) throw new Error(calendarsRes.error.message);

  const tzByUser = new Map(
    settingsRes.data.map((s) => [s.user_id, isValidTimeZone(s.timezone) ? s.timezone : DEFAULT_TIMEZONE])
  );
  const calendars = new Map(calendarsRes.data.map((c, i) => [c.id, mapCalendar(c, i)]));
  const completed = new Set(completionsRes.data.map((c) => completionKey(c.event_id, c.date)));

  const toInsert: Database["public"]["Tables"]["notifications"]["Insert"][] = [];
  for (const row of rows) {
    const event = mapEvent(row);
    const offsets = effectiveReminders(event, calendars.get(row.calendar_id));
    for (const reminder of planEventReminders({
      event,
      offsets,
      timeZone: tzByUser.get(row.user_id) ?? DEFAULT_TIMEZONE,
      now,
      completed,
    })) {
      toInsert.push({ user_id: row.user_id, event_id: row.id, url: "/planificador", ...reminder });
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
// 1b. ENCOLAR: avisos por inactividad y racha en riesgo (idempotente)
// ------------------------------------------------------------------------------

export async function enqueueInactivityNudges(supabase: Admin, now: Date): Promise<number> {
  const minHours = Math.min(...INACTIVITY_OPTIONS);
  const { data: rows, error } = await supabase
    .from("user_settings")
    .select("user_id, timezone, last_seen_at, inactivity_reminder_hours, streak_current, streak_last_day")
    .not("inactivity_reminder_hours", "is", null)
    .not("last_seen_at", "is", null)
    .lte("last_seen_at", new Date(now.getTime() - minHours * 3_600_000).toISOString());
  if (error) throw new Error(`No se pudo leer la actividad: ${error.message}`);
  if (!rows.length) return 0;

  // Solo tiene sentido para quien puede recibir push: si no, quedaría solo en la
  // campana in-app, que justamente no está mirando.
  const { data: subs, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("user_id")
    .in("user_id", rows.map((r) => r.user_id));
  if (subsError) throw new Error(`No se pudieron leer las suscripciones: ${subsError.message}`);
  const withPush = new Set(subs.map((s) => s.user_id));

  const toInsert: Database["public"]["Tables"]["notifications"]["Insert"][] = [];
  for (const row of rows) {
    if (!withPush.has(row.user_id) || !row.last_seen_at || !isInactivityHours(row.inactivity_reminder_hours)) continue;
    toInsert.push(
      ...planInactivityNudges({
        userId: row.user_id,
        now,
        lastSeenAt: new Date(row.last_seen_at),
        everyHours: row.inactivity_reminder_hours,
        timeZone: isValidTimeZone(row.timezone) ? row.timezone : DEFAULT_TIMEZONE,
        streakCurrent: row.streak_current,
        streakLastDay: row.streak_last_day,
      })
    );
  }

  if (!toInsert.length) return 0;
  const { error: insertError, count } = await supabase
    .from("notifications")
    .upsert(toInsert, { onConflict: "dedupe_key", ignoreDuplicates: true, count: "exact" });
  if (insertError) throw new Error(`No se pudieron encolar los avisos de inactividad: ${insertError.message}`);
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
