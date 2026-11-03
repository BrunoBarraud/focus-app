import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/utils/supabase/admin";
import { dispatchDueNotifications, enqueueInactivityNudges, enqueueReminders } from "@/lib/notifications/reminders";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Sin secreto configurado el endpoint queda cerrado (antes era público).
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/**
 * Corre cada minuto (pg_cron en Supabase; ver la migración) y una vez por día
 * desde Vercel como respaldo:
 *   1. encola los recordatorios de los próximos 35 minutos (idempotente)
 *   2. encola los avisos por inactividad y de racha en riesgo (idempotente)
 *   3. reclama las notificaciones vencidas y las envía por Web Push
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const now = new Date();
    const enqueued = await enqueueReminders(supabase, now);
    // Un fallo acá (por ejemplo, migración pendiente) no frena los recordatorios
    // de tareas ni el envío de lo que ya está en cola.
    const nudged = await enqueueInactivityNudges(supabase, now).catch((err) => {
      console.error("[cron] Avisos de inactividad:", err);
      return 0;
    });
    const dispatched = await dispatchDueNotifications(supabase);
    return NextResponse.json({ ok: true, enqueued, nudged, ...dispatched });
  } catch (error) {
    console.error("[cron] Error:", error);
    return NextResponse.json({ ok: false, error: "Error interno del cron." }, { status: 500 });
  }
}
