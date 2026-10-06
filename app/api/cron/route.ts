import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webPush from "web-push";

// Configurar Web Push
webPush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@focus.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Cliente Supabase con permisos de Admin (Service Role)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    // 1. Obtener la hora actual en UTC
    const now = new Date();
    
    // Calcular el día de la semana para filtrar (L, M, X, J, V, S, D)
    const days = ["D", "L", "M", "X", "J", "V", "S"];
    const todayStr = days[now.getDay()];

    // 2. Obtener todos los eventos que sucedan hoy y tengan hora de inicio
    const { data: events, error: eventsErr } = await supabase
      .from("calendar_events")
      .select("id, user_id, title, start_time, days_of_week, status")
      .eq("status", "pending")
      .not("start_time", "is", null);

    if (eventsErr) throw eventsErr;

    const eventsToNotify = (events || []).filter(event => {
      // Verificar si el evento ocurre hoy (days_of_week contiene el día actual)
      if (!event.days_of_week || !event.days_of_week.includes(todayStr)) return false;

      // Parsear la hora del evento (ej: "14:30")
      const [hours, minutes] = event.start_time.split(":").map(Number);
      
      // Crear una fecha para el evento hoy (asumiendo UTC -3 para simplificar, idealmente se usa timezone del usuario)
      // Ajuste rápido: asume que la hora ingresada es la hora local (America/Argentina/Buenos_Aires UTC-3)
      const eventTime = new Date(now);
      eventTime.setUTCHours(hours + 3, minutes, 0, 0);
      
      const nowRounded = new Date(now);
      nowRounded.setUTCSeconds(0, 0);

      const diffMinutes = Math.round((eventTime.getTime() - nowRounded.getTime()) / 60000);

      // Si faltan exactamente 30, 15 o 5 minutos
      return diffMinutes === 30 || diffMinutes === 15 || diffMinutes === 5;
    });

    if (eventsToNotify.length === 0) {
      return NextResponse.json({ message: "No hay notificaciones pendientes" });
    }

    // 3. Obtener suscripciones de los usuarios afectados
    const userIds = [...new Set(eventsToNotify.map(e => e.user_id))];
    const { data: subscriptions, error: subErr } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", userIds);

    if (subErr) throw subErr;

    // 4. Enviar notificaciones
    let sentCount = 0;
    for (const event of eventsToNotify) {
      const userSubs = (subscriptions || []).filter(s => s.user_id === event.user_id);
      
      const payload = JSON.stringify({
        title: "Recordatorio de Focus",
        body: `Tu tarea "${event.title}" empieza pronto.`,
        url: "/dashboard"
      });

      for (const sub of userSubs) {
        try {
          await webPush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { auth: sub.auth_key, p256dh: sub.p256dh_key }
            },
            payload
          );
          sentCount++;
        } catch (err: any) {
          console.error("Error enviando push a un dispositivo:", err);
          // Si el endpoint expiró, se puede borrar de la BD
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      }
    }

    return NextResponse.json({ success: true, sent: sentCount });
  } catch (error: any) {
    console.error("Error en cron:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
