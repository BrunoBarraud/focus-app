"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import type { GoalCategory, GoalTimeframe } from "@/lib/types";
import { currentQuarter } from "./useGoals";

const TIMEFRAMES: GoalTimeframe[] = ["Q1", "Q2", "Q3", "Q4", "Anual"];

interface NewGoalFormProps {
  category: GoalCategory;
  onAdd: (input: {
    title: string;
    category: GoalCategory;
    timeframe: GoalTimeframe;
    targetDate: string | null;
  }) => Promise<boolean>;
}

/** Alta rápida de una meta: título, plazo y fecha límite opcional. */
export function NewGoalForm({ category, onAdd }: NewGoalFormProps) {
  const [title, setTitle] = React.useState("");
  const [timeframe, setTimeframe] = React.useState<GoalTimeframe>(currentQuarter);
  const [targetDate, setTargetDate] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    setTitle("");
    const created = await onAdd({ title: clean, category, timeframe, targetDate: targetDate || null });
    if (created) setTargetDate("");
    else setTitle(clean);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        aria-label="Nueva meta"
        placeholder={`Nueva meta ${category === "personal" ? "personal" : "profesional"}`}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        className="flex-1 min-w-[180px] bg-zinc-950/60 border border-zinc-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
      />

      <select
        aria-label="Plazo"
        value={timeframe}
        onChange={(e) => setTimeframe(e.target.value as GoalTimeframe)}
        className="bg-zinc-950/60 border border-zinc-700/80 rounded-xl px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-violet-500"
      >
        {TIMEFRAMES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <input
        type="date"
        aria-label="Fecha límite (opcional)"
        title="Fecha límite (opcional)"
        value={targetDate}
        onChange={(e) => setTargetDate(e.target.value)}
        className="bg-zinc-950/60 border border-zinc-700/80 rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-violet-500"
      />

      <button
        type="submit"
        className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
      >
        <Plus className="h-4 w-4" />
        Agregar
      </button>
    </form>
  );
}
