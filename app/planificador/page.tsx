"use client";

import * as React from "react";
import { WeeklyKanban } from "@/components/planificador/WeeklyKanban";
import { getWeeklyTasks } from "@/lib/api";
import { PlannerTask } from "@/lib/types";

export default function PlanificadorPage() {
  const [tasks, setTasks] = React.useState<PlannerTask[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      try {
        const data = await getWeeklyTasks();
        setTasks(data);
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
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-80 h-96 bg-zinc-900 rounded-2xl shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <WeeklyKanban initialTasks={tasks} />
    </div>
  );
}
