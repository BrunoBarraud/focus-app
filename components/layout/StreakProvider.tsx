"use client";

import * as React from "react";
import { Flame } from "lucide-react";
import type { StreakInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StreakContextValue {
  streak: StreakInfo | null;
  setStreak: (streak: StreakInfo) => void;
}

const StreakContext = React.createContext<StreakContextValue | null>(null);

/** Racha de uso del usuario. La carga y actualiza <SessionBootstrap>. */
export function StreakProvider({ children }: { children: React.ReactNode }) {
  const [streak, setStreak] = React.useState<StreakInfo | null>(null);
  const value = React.useMemo(() => ({ streak, setStreak }), [streak]);
  return <StreakContext.Provider value={value}>{children}</StreakContext.Provider>;
}

export function useStreak() {
  return React.useContext(StreakContext)?.streak ?? null;
}

export function useSetStreak() {
  return React.useContext(StreakContext)?.setStreak;
}

function daysLabel(n: number) {
  return n === 1 ? "1 día" : `${n} días`;
}

/** El "fueguito": días seguidos usando Focus. */
export function StreakBadge({ className, showLabel = false }: { className?: string; showLabel?: boolean }) {
  const streak = useStreak();
  if (!streak || streak.current < 1) return null;

  const hot = streak.current >= 3;
  const description = `Racha: ${daysLabel(streak.current)} seguidos usando Focus. Tu mejor racha: ${daysLabel(streak.best)}.`;

  return (
    <span
      title={description}
      aria-label={description}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold tabular-nums",
        hot
          ? "border-orange-500/40 bg-orange-500/15 text-orange-300"
          : "border-zinc-700 bg-zinc-900 text-zinc-300",
        className
      )}
    >
      <Flame className={cn("h-3.5 w-3.5", hot ? "fill-orange-400 text-orange-400" : "text-zinc-400")} />
      {showLabel ? daysLabel(streak.current) : streak.current}
    </span>
  );
}
