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

// ==========================================
// LISTENER PARA NOTIFICACIONES PUSH (MÓVIL)
// ==========================================
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? { 
    title: "Focus App", 
    body: "Tienes notificaciones pendientes." 
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon.jpg", // Logo oscuro actual
      badge: "/icon.jpg", // Ícono minimalista monocromático para barra de estado
      data: { url: data.url || "/dashboard" }
    })
  );
});

// Al clickear la notificación en el celular o PC
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow(event.notification.data.url)
  );
});

serwist.addEventListeners();
