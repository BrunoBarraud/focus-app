"use client";

import * as React from "react";
import { BellRing } from "lucide-react";
import { setInactivityReminderAction } from "@/app/actions/profile";
import { useToast } from "@/components/ui/toast";
import { StreakBadge, useStreak } from "@/components/layout/StreakProvider";
import { INACTIVITY_OPTIONS, type InactivityHours } from "@/lib/notifications/inactivity";
import { getPushState, subscribeToPush } from "@/lib/push-client";

const OFF = "off";

/** Racha de uso + cada cuánto avisar si no se usa la app. */
export function StreakReminder({ initialHours }: { initialHours: InactivityHours | null }) {
  const toast = useToast();
  const streak = useStreak();
  const [hours, setHours] = React.useState<InactivityHours | null>(initialHours);
  const [saving, setSaving] = React.useState(false);

  const handleChange = async (value: string) => {
    const next = value === OFF ? null : (Number(value) as InactivityHours);
    const previous = hours;
    setHours(next);
    setSaving(true);
    const res = await setInactivityReminderAction(next);
    setSaving(false);
    if (!res.ok) {
      setHours(previous);
      toast.error(res.error);
      return;
    }
    if (next === null) {
      toast.success("Listo, no te vamos a avisar.");
      return;
    }

    // Sin notificaciones activadas en este dispositivo el aviso no llega: se piden acá.
    const state = await getPushState().catch(() => "unsupported" as const);
    if (state === "subscribed") {
      toast.success(`Te avisamos si pasan ${next === 1 ? "1 hora" : `${next} horas`} sin que entres.`);
    } else if (state === "unsupported") {
      toast.error("Este navegador no permite notificaciones. Probá desde Chrome o instalando la app.");
    } else {
      const push = await subscribeToPush();
      if (push.ok) toast.success("Notificaciones activadas. Te vamos a avisar si no entrás.");
      else toast.error(push.error);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {streak && streak.current > 0 && (
        <div className="flex items-center gap-2">
          <StreakBadge showLabel className="text-sm px-2.5 py-1" />
          {streak.best > streak.current && (
            <span className="text-xs text-zinc-400">Mejor: {streak.best}</span>
          )}
        </div>
      )}

      <label className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950/60 pl-2.5 pr-1 py-1 text-xs text-zinc-300">
        <BellRing className="h-3.5 w-3.5 text-violet-400 shrink-0" />
        <span className="whitespace-nowrap">Avisarme si no entro</span>
        <select
          value={hours === null ? OFF : String(hours)}
          onChange={(e) => handleChange(e.target.value)}
          disabled={saving}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-violet-500 cursor-pointer disabled:opacity-60"
        >
          <option value={OFF}>Nunca</option>
          {INACTIVITY_OPTIONS.map((h) => (
            <option key={h} value={h}>
              Cada {h} {h === 1 ? "hora" : "horas"}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
