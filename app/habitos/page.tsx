"use client";

import * as React from "react";
import { HabitMatrix } from "@/components/habitos/HabitMatrix";
import { getHabits } from "@/lib/api";
import { Habit } from "@/lib/types";

export default function HabitosPage() {
  const [habits, setHabits] = React.useState<Habit[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      try {
        const data = await getHabits();
        setHabits(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-zinc-900 rounded-lg w-1/4" />
        <div className="h-96 bg-zinc-900 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="pb-12">
      <HabitMatrix initialHabits={habits} />
    </div>
  );
}
