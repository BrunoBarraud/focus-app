"use client";

import * as React from "react";
import { syncTimezoneAction, touchActivityAction } from "@/app/actions/profile";
import { resyncPushSubscription, subscribeToPush } from "@/lib/push-client";
import { useSetStreak } from "./StreakProvider";

/** Cada cuánto se avisa "sigo usando la app" mientras está en pantalla. */
const HEARTBEAT_MS = 10 * 60_000;
/** Mínimo entre dos registros (por ejemplo, al cambiar de pestaña muchas veces). */
const MIN_TOUCH_GAP_MS = 2 * 60_000;

/**
 * Tareas de sincronización que corren una vez por carga de la app con sesión:
 *  - zona horaria del navegador -> user_settings (los recordatorios la usan)
 *  - suscripción push del navegador -> push_subscriptions (y su renovación)
 *  - actividad y racha de uso: al abrir, al volver a la pestaña y cada 10 min
 *    mientras la app está visible (así no te avisa "no la usaste" mientras la usás)
 */
export function SessionBootstrap() {
  const setStreak = useSetStreak();

  React.useEffect(() => {
    let lastTouch = 0;
    const touch = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastTouch < MIN_TOUCH_GAP_MS) return;
      lastTouch = now;
      touchActivityAction().then((res) => {
        if (res.ok) setStreak?.(res.data);
        else console.warn("No se pudo registrar la actividad:", res.error);
      });
    };

    // La zona horaria va primero: la racha se calcula con el día local.
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    (tz ? syncTimezoneAction(tz) : Promise.resolve(null))
      .then((res) => {
        if (res && !res.ok) console.warn("No se pudo sincronizar la zona horaria:", res.error);
      })
      .finally(touch);

    const interval = setInterval(touch, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", touch);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", touch);
    };
  }, [setStreak]);

  React.useEffect(() => {
    resyncPushSubscription().catch((err) => console.warn("Error al re-sincronizar push:", err));

    // El service worker avisa cuando el navegador rotó la suscripción push.
    // Con el permiso ya otorgado, re-suscribirse no muestra ningún diálogo.
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== "PUSH_SUBSCRIPTION_CHANGED") return;
      if (Notification.permission !== "granted") return;
      subscribeToPush().then((res) => {
        if (!res.ok) console.warn("No se pudo renovar la suscripción push:", res.error);
      });
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);

  return null;
}
