"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Habit } from "@/lib/types";
import { Flame, Trophy, CheckCircle2, TrendingUp, ArrowUpRight } from "lucide-react";
import Link from "next/link";

interface StatsOverviewProps {
  habits: Habit[];
}

export function StatsOverview({ habits }: StatsOverviewProps) {
  const today = new Date().getDate();

  // Sort habits by streak to get Top 5
  const topHabits = [...habits]
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 5);

  const totalCompletionsToday = habits.filter((h) => h.completedDays[today]).length;
  const globalRate = Math.round((totalCompletionsToday / (habits.length || 1)) * 100);
  const bestGlobalStreak = Math.max(...habits.map((h) => h.streak), 0);
  const totalCompletedThisMonth = habits.reduce(
    (acc, h) => acc + Object.values(h.completedDays).filter(Boolean).length,
    0
  );


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 3 Metric Cards */}
      <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <Card className="border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700/60 transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-400">Progreso Global de Hoy</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                {globalRate}%
              </h3>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3" /> {totalCompletionsToday} de {habits.length} hábitos listos
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 2 */}
        <Card className="border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700/60 transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-400">Racha Récord Activa</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-amber-400 mt-1 flex items-center gap-1.5">
                {bestGlobalStreak} <span className="text-sm font-normal text-zinc-400">días</span>
              </h3>
              <p className="text-[11px] text-zinc-400 mt-1">
                Consistencia inquebrantable
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Flame className="h-6 w-6 fill-amber-500" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 3 */}
        <Card className="border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700/60 transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-400">Completados Este Mes</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-teal-400 mt-1">
                {totalCompletedThisMonth}{" "}
                <span className="text-sm font-normal text-zinc-400">registros</span>
              </h3>
              <p className="text-[11px] text-teal-400 flex items-center gap-1 mt-1">
                {habits.length > 0
                  ? `${habits.length} hábito${habits.length > 1 ? "s" : ""} activo${habits.length > 1 ? "s" : ""}`
                  : "Sin hábitos todavía"}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Trophy className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Top 5 Habit Streaks with Progress */}
      <Card className="lg:col-span-3 border-zinc-800/80 bg-zinc-900/50">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-500 fill-amber-500" /> Top 5 Hábitos y Rachas
            </CardTitle>
            <CardDescription>
              Seguimiento de consistencia acumulada este mes
            </CardDescription>
          </div>
          <Link
            href="/habitos"
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors group"
          >
            Ver matriz completa
            <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          {topHabits.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-zinc-800 rounded-xl">
              <p className="text-xs text-zinc-400">Aún no tienes hábitos registrados en tu cuenta.</p>
              <Link
                href="/habitos"
                className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline mt-2 font-medium"
              >
                + Crear mi primer hábito en Supabase
              </Link>
            </div>
          ) : (
            topHabits.map((habit, index) => {
            // Target progress percentage: days completed this month vs monthly target
            const completedCount = Object.values(habit.completedDays).filter(Boolean).length;
            const progressPercent = Math.min(
              100,
              Math.round((completedCount / habit.monthlyTargetDays) * 100)
            );

            return (
              <div
                key={habit.id}
                className="group rounded-xl p-3 bg-zinc-900/60 border border-zinc-800/60 hover:border-zinc-700/70 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-400">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                      {habit.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      <Flame className="h-3.5 w-3.5 fill-amber-500 text-amber-500 animate-pulse" />
                      {habit.streak} días
                    </span>
                    <span className="text-xs text-zinc-400 font-medium">
                      {progressPercent}%
                    </span>
                  </div>
                </div>

                <Progress
                  value={progressPercent}
                  className="h-1.5 bg-zinc-800/90"
                  indicatorClassName="bg-gradient-to-r from-amber-500 to-emerald-400"
                />

                <div className="flex justify-between items-center text-[10px] text-zinc-400 mt-1.5">
                  <span>Meta: {habit.monthlyTargetDays} días/mes</span>
                  <span>Récord personal: {habit.bestStreak} días</span>
                </div>
              </div>
            );
          }))}
        </CardContent>
      </Card>
    </div>
  );
}
