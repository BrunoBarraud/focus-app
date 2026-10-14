"use client";

import * as React from "react";
import { syncTimezoneAction } from "@/app/actions/profile";
import { resyncPushSubscription, subscribeToPush } from "@/lib/push-client";

/**
 * Tareas de sincronización que corren una vez por carga de la app con sesión:
 *  - zona horaria del navegador -> user_settings (los recordatorios la usan)
 *  - suscripción push del navegador -> push_subscriptions (y su renovación)
 */
export function SessionBootstrap() {
  React.useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      syncTimezoneAction(tz).then((res) => {
        if (!res.ok) console.warn("No se pudo sincronizar la zona horaria:", res.error);
      });
    }
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
