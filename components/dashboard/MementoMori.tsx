"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Hourglass, Quote, Sparkles, Settings } from "lucide-react";
import { LifeExpectancyStats } from "@/lib/types";
import { ProfileModal } from "@/components/layout/ProfileModal";

interface MementoMoriProps {
  stats: LifeExpectancyStats;
}

export function MementoMori({ stats }: MementoMoriProps) {
  const [profileOpen, setProfileOpen] = React.useState(false);
  const percentage = Math.round((stats.weeksLived / stats.totalWeeks) * 100);
  const weeksRemaining = stats.totalWeeks - stats.weeksLived;

  return (
    <>
      <Card className="border-zinc-800/80 bg-gradient-to-b from-zinc-900/70 via-zinc-950 to-zinc-900/90 shadow-md relative overflow-hidden group">
        {/* Glow background accent */}
        <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-violet-600/15 blur-3xl pointer-events-none group-hover:bg-violet-600/25 transition-all" />

        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300 border border-violet-500/20 shadow-sm">
                <Hourglass className="h-4 w-4 text-violet-300 animate-spin-slow" />
              </div>
              <div>
                <CardTitle className="text-sm sm:text-base font-semibold text-zinc-100 tracking-wide uppercase flex items-center gap-2">
                  Memento Mori
                </CardTitle>
                <p className="text-[11px] text-zinc-400">
                  Recuerda la finitud del tiempo para actuar con propósito
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-violet-300 border border-zinc-700/60 transition-all cursor-pointer"
                title="Configurar fecha de nacimiento real y expectativa de vida"
              >
                <Settings className="h-3 w-3" />
                <span className="hidden sm:inline">Configurar mi fecha</span>
              </button>

              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/30 font-mono">
                {percentage}% Vivido
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress Display */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                <span className="font-mono font-bold text-white text-base">
                  {stats.weeksLived.toLocaleString("es-ES")}
                </span>
                <span className="text-zinc-400">de</span>
                <span className="font-mono font-semibold text-zinc-400">
                  {stats.totalWeeks.toLocaleString("es-ES")} semanas
                </span>
              </span>

              <span className="text-xs text-zinc-400 font-mono">
                Restan:{" "}
                <strong className="text-violet-400 font-bold">
                  {weeksRemaining.toLocaleString("es-ES")}
                </strong>{" "}
                semanas
              </span>
            </div>

            <Progress
              value={percentage}
              className="h-2.5 bg-zinc-800/90"
              indicatorClassName="bg-gradient-to-r from-violet-600 via-fuchsia-400 to-indigo-400"
            />
          </div>

          {/* Seneca Quote */}
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-3.5 flex items-start gap-3">
            <Quote className="h-4 w-4 text-violet-400/80 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs sm:text-sm italic text-zinc-300 font-serif leading-relaxed">
                &ldquo;{stats.senecaQuote}&rdquo;
              </p>
              <p className="text-[11px] font-semibold text-zinc-400 tracking-wider uppercase">
                — Séneca, De Brevitate Vitae
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Modal */}
      <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}
