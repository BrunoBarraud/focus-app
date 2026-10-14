"use client";

import * as React from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { getPushState, subscribeToPush, unsubscribeFromPush, type PushState } from "@/lib/push-client";

export function PushNotificationButton() {
  const toast = useToast();
  const [state, setState] = React.useState<PushState | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    getPushState()
      .then((s) => !cancelled && setState(s))
      .catch(() => !cancelled && setState("unsupported"));
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === null || state === "unsupported") return null;

  const isSubscribed = state === "subscribed";

  const handleClick = async () => {
    setLoading(true);
    const res = isSubscribed ? await unsubscribeFromPush() : await subscribeToPush();
    setLoading(false);

    if (!res.ok) {
      toast.error(res.error);
      setState(await getPushState());
      return;
    }
    setState(isSubscribed ? "unsubscribed" : "subscribed");
    toast.success(isSubscribed ? "Notificaciones desactivadas en este dispositivo." : "Notificaciones activadas.");
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading || state === "denied"}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed ${
        isSubscribed
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
          : "bg-white/[0.06] hover:bg-white/[0.1] border-white/10 text-zinc-200"
      }`}
      title={
        state === "denied"
          ? "Bloqueaste las notificaciones: habilitalas desde la configuración del navegador"
          : isSubscribed
            ? "Desactivar recordatorios en este dispositivo"
            : "Activar recordatorios push"
      }
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isSubscribed ? (
        <Bell className="h-4 w-4" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">
        {state === "denied" ? "Notificaciones bloqueadas" : isSubscribed ? "Notificaciones Activas" : "Activar Alertas"}
      </span>
    </button>
  );
}
