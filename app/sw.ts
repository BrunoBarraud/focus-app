/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import { type PrecacheEntry, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

interface PushPayload {
  id?: string;
  title: string;
  body: string;
  url?: string;
}

function parsePayload(event: PushEvent): PushPayload {
  const fallback = { title: "Focus App", body: "Tenés notificaciones pendientes." };
  try {
    const data = event.data?.json() as Partial<PushPayload> | undefined;
    return data?.title ? { ...fallback, ...data } : fallback;
  } catch {
    // Payload que no es JSON: se muestra como texto.
    return { ...fallback, body: event.data?.text() || fallback.body };
  }
}

// ==========================================
// NOTIFICACIONES PUSH
// ==========================================
self.addEventListener("push", (event) => {
  const data = parsePayload(event);
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon.jpg",
      badge: "/icon.jpg",
      // El tag evita duplicados si el mismo aviso llega dos veces.
      tag: data.id,
      data: { url: data.url || "/dashboard" },
    })
  );
});

// Al tocar la notificación: enfocar una pestaña de la app si ya hay una abierta.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url ?? "/dashboard", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          if (client.url !== target && "navigate" in client) await client.navigate(target);
          return;
        }
      }
      await self.clients.openWindow(target);
    })()
  );
});

// El navegador puede rotar la suscripción (vencimiento, cambio de claves). Sin
// este handler la suscripción nueva nunca llegaba al servidor y el usuario
// dejaba de recibir avisos en silencio. Se avisa a las pestañas abiertas para
// que la re-registren (la server action necesita la cookie de sesión).
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      windows.forEach((client) => client.postMessage({ type: "PUSH_SUBSCRIPTION_CHANGED" }));
    })()
  );
});

serwist.addEventListeners();
