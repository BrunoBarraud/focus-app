"use client";

import {
  removePushSubscriptionAction,
  savePushSubscriptionAction,
} from "@/app/actions/notifications";

export type PushState = "unsupported" | "denied" | "subscribed" | "unsubscribed";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  return navigator.serviceWorker.register("/sw.js");
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

export async function getPushState(): Promise<PushState> {
  if (!isPushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return (await currentSubscription()) ? "subscribed" : "unsubscribed";
}

/** Pide permiso, suscribe este navegador y lo registra para el usuario actual. */
export async function subscribeToPush(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isPushSupported()) {
    return { ok: false, error: "Este navegador no soporta notificaciones push." };
  }
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    return { ok: false, error: "Las notificaciones no están configuradas en el servidor (falta la clave VAPID)." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return {
      ok: false,
      error:
        permission === "denied"
          ? "Bloqueaste las notificaciones. Habilitalas desde la configuración del navegador."
          : "No se otorgó el permiso de notificaciones.",
    };
  }

  try {
    const reg = await getRegistration();
    await navigator.serviceWorker.ready;
    const subscription =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      }));

    const res = await savePushSubscriptionAction(subscription.toJSON());
    if (!res.ok) {
      await subscription.unsubscribe().catch(() => {});
      return res;
    }
    return { ok: true };
  } catch (err) {
    console.error("Error al suscribir a push:", err);
    return { ok: false, error: "No se pudieron activar las notificaciones en este dispositivo." };
  }
}

/** Desuscribe este navegador y borra la suscripción del servidor. */
export async function unsubscribeFromPush(): Promise<{ ok: true } | { ok: false; error: string }> {
  const subscription = await currentSubscription();
  if (!subscription) return { ok: true };
  const res = await removePushSubscriptionAction(subscription.endpoint);
  await subscription.unsubscribe().catch(() => {});
  return res.ok ? { ok: true } : res;
}

/**
 * Si el navegador ya tiene una suscripción (por ejemplo, porque se cerró
 * sesión sin limpiarla o la base la borró por un 410), se vuelve a registrar
 * para el usuario actual, así navegador y base no quedan desincronizados.
 */
export async function resyncPushSubscription(): Promise<void> {
  if (!isPushSupported() || Notification.permission !== "granted") return;
  const subscription = await currentSubscription();
  if (!subscription) return;
  const res = await savePushSubscriptionAction(subscription.toJSON());
  if (!res.ok) console.warn("No se pudo re-sincronizar la suscripción push:", res.error);
}
