"use client";

import * as React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { getNotificationsAction, markNotificationsReadAction } from "@/app/actions/notifications";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/utils/supabase/client";
import { playNotificationSound } from "@/lib/sound";
import type { AppNotification } from "@/lib/types";
import { cn } from "@/lib/utils";

const FALLBACK_REFRESH_MS = 60_000;

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} d`;
}

interface NotificationsApi {
  items: AppNotification[];
  markAllRead: () => Promise<void>;
}

const NotificationsContext = React.createContext<NotificationsApi | null>(null);

/**
 * Bandeja in-app. El estado leído/no leído vive en la base (no en el cliente),
 * así que es consistente entre dispositivos. Se actualiza por Supabase Realtime
 * y, como respaldo si el socket se cae, al volver a la pestaña y cada minuto.
 * Hay UNA sola instancia por app (las campanas de escritorio y móvil la comparten).
 */
export function NotificationsProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const toast = useToast();
  const [items, setItems] = React.useState<AppNotification[]>([]);
  const knownIds = React.useRef<Set<string> | null>(null);

  const applyFetched = React.useCallback(
    (data: AppNotification[]) => {
      // Avisar solo de las que llegaron con la app abierta (no en la primera carga).
      const known = knownIds.current;
      if (known) {
        const fresh = data.filter((n) => !n.readAt && !known.has(n.id));
        if (fresh.length > 0) {
          playNotificationSound();
          toast.info(fresh[0].title + (fresh.length > 1 ? ` (+${fresh.length - 1})` : ""));
        }
      }
      knownIds.current = new Set(data.map((n) => n.id));
      setItems(data);
    },
    [toast]
  );

  React.useEffect(() => {
    // Un fallo transitorio se ignora: se reintenta en el próximo ciclo.
    const refresh = () =>
      getNotificationsAction().then((res) => {
        if (res.ok) applyFetched(res.data);
      });
    refresh();

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => refresh()
      )
      .subscribe();

    const interval = setInterval(refresh, FALLBACK_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [userId, applyFetched]);

  const markAllRead = React.useCallback(async () => {
    const ids = items.filter((n) => !n.readAt).map((n) => n.id);
    if (ids.length === 0) return;
    const readAt = new Date().toISOString();
    setItems((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, readAt } : n)));
    const res = await markNotificationsReadAction(ids);
    if (!res.ok) {
      setItems((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, readAt: null } : n)));
      toast.error(res.error);
    }
  }, [items, toast]);

  const api = React.useMemo(() => ({ items, markAllRead }), [items, markAllRead]);
  return <NotificationsContext.Provider value={api}>{children}</NotificationsContext.Provider>;
}

export function NotificationBell({ align = "right" }: { align?: "left" | "right" }) {
  const ctx = React.useContext(NotificationsContext);
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic afuera.
  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!ctx) return null;
  const { items, markAllRead } = ctx;
  const unread = items.filter((n) => !n.readAt);

  const handleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) markAllRead();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="relative rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors cursor-pointer"
        aria-label={unread.length ? `${unread.length} notificaciones sin leer` : "Notificaciones"}
      >
        <Bell className="h-4.5 w-4.5" />
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-xl shadow-2xl",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          <div className="px-4 py-3 border-b border-zinc-800 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Notificaciones
          </div>
          <ul className="max-h-80 overflow-y-auto divide-y divide-zinc-800/70">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-xs text-zinc-500">No tenés notificaciones.</li>
            ) : (
              items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.url}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 hover:bg-zinc-900/80 transition-colors"
                  >
                    <p className="text-sm font-medium text-zinc-100">{n.title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{n.body}</p>
                    <p className="text-[10px] text-zinc-500 mt-1">{timeAgo(n.scheduledFor)}</p>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
