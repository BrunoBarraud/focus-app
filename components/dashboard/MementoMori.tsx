"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Hourglass, Quote, Sparkles } from "lucide-react";
import { LifeExpectancyStats } from "@/lib/types";

interface MementoMoriProps {
  stats: LifeExpectancyStats;
}

export function MementoMori({ stats }: MementoMoriProps) {
  const percentage = Math.round((stats.weeksLived / stats.totalWeeks) * 100);
  const weeksRemaining = stats.totalWeeks - stats.weeksLived;

  return (
    <Card className="border-zinc-800/80 bg-gradient-to-b from-zinc-900/70 via-zinc-950 to-zinc-900/90 shadow-md relative overflow-hidden">
      {/* Glow background accent */}
      <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800/80 text-zinc-300 border border-zinc-700/50">
              <Hourglass className="h-4 w-4 text-zinc-300 animate-spin-slow" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold text-zinc-100 tracking-wide uppercase">
                Memento Mori
              </CardTitle>
              <p className="text-[11px] text-zinc-400">
                Recuerda la finitud del tiempo para actuar con propósito
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-800/80 text-zinc-300 border border-zinc-700/60 font-mono">
            {percentage}% Vivido
          </span>
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
              <strong className="text-teal-400">
                {weeksRemaining.toLocaleString("es-ES")}
              </strong>{" "}
              semanas
            </span>
          </div>

          <Progress
            value={percentage}
            className="h-2.5 bg-zinc-800/90"
            indicatorClassName="bg-gradient-to-r from-zinc-400 via-teal-400 to-emerald-400"
          />
        </div>

        {/* Seneca Quote */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-3.5 flex items-start gap-3">
          <Quote className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
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
  );
}
