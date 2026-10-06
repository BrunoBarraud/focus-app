"use client";

import * as React from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { savePushSubscriptionAction } from "@/app/actions";

// Utilidad para decodificar la clave pública VAPID
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationButton() {
  const [isSubscribed, setIsSubscribed] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    // Chequear si ya hay una suscripción activa
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  const handleSubscribe = async () => {
    try {
      setLoading(true);
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Permiso de notificaciones denegado.");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error("No VAPID public key found in env");
        return;
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Enviar la suscripción al backend
      const res = await savePushSubscriptionAction(JSON.parse(JSON.stringify(subscription)));
      
      if (res?.error) {
        alert("Error al guardar suscripción: " + res.error);
      } else {
        setIsSubscribed(true);
      }
    } catch (err) {
      console.error("Error subscribiendo a push", err);
      alert("No se pudo activar las notificaciones push en este dispositivo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSubscribe}
      disabled={isSubscribed || loading}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
        isSubscribed
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 cursor-default"
          : "bg-white/[0.06] hover:bg-white/[0.1] border-white/10 text-zinc-200"
      }`}
      title={isSubscribed ? "Notificaciones activadas" : "Activar recordatorios Push"}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isSubscribed ? (
        <Bell className="h-4 w-4" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">
        {isSubscribed ? "Notificaciones Activas" : "Activar Alertas"}
      </span>
    </button>
  );
}
