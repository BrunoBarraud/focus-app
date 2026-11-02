"use client";

import * as React from "react";
import type { Goal, GoalCategory } from "@/lib/types";
import { formatTargetDate, isTempId } from "./useGoals";
import { MilestoneEditor } from "./MilestoneEditor";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, Target, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoalsListProps {
  category: GoalCategory;
  goals: Goal[];
  onToggleMilestone: (goalId: string, milestoneId: string) => void;
  onAddMilestone: (goalId: string, title: string) => Promise<boolean>;
  onDeleteMilestone: (goalId: string, milestoneId: string) => void;
  onDeleteGoal: (goalId: string) => void;
}

// Presentacional: el estado vive en <GoalsTabs> (useGoals) para que las
// pestañas Personal y Profesional compartan una sola lista.
export function GoalsList({
  category,
  goals,
  onToggleMilestone,
  onAddMilestone,
  onDeleteMilestone,
  onDeleteGoal,
}: GoalsListProps) {
  const filteredGoals = goals.filter((g) => g.category === category);

  return (
    <div className="space-y-4">
      {filteredGoals.length === 0 ? (
        <Card className="border-dashed border-zinc-800 bg-zinc-950/40 p-8 text-center">
          <Target className="h-8 w-8 text-zinc-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-zinc-200">
            Todavía no tenés metas {category === "personal" ? "personales" : "profesionales"}.
          </p>
          <p className="text-sm text-zinc-400 mt-1">Escribí una arriba y después agregale los hitos.</p>
        </Card>
      ) : (
        filteredGoals.map((goal) => {
        const completedMilestones = goal.milestones.filter((m) => m.completed).length;

        return (
          <Card
            key={goal.id}
            className={cn(
              "group border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700/70 transition-all",
              isTempId(goal.id) && "opacity-60 pointer-events-none"
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    <Target className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-zinc-100">
                      {goal.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[11px] py-0 px-2 border-violet-500/30 text-violet-300">
                        {goal.timeframe}
                      </Badge>
                      <span className="text-xs text-zinc-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-violet-400" /> {formatTargetDate(goal.targetDate)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="font-mono text-sm font-bold text-violet-400">
                    {goal.progress}%
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteGoal(goal.id)}
                    aria-label={`Eliminar la meta ${goal.title}`}
                    title="Eliminar meta"
                    className="p-1.5 rounded text-zinc-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 pt-0">
              <Progress
                value={goal.progress}
                className="h-2 bg-zinc-800/80"
                indicatorClassName="bg-gradient-to-r from-violet-600 via-fuchsia-400 to-indigo-400"
              />

              <div className="pt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Hitos ({completedMilestones}/{goal.milestones.length})
                </p>
                <MilestoneEditor
                  goal={goal}
                  onToggle={onToggleMilestone}
                  onAdd={onAddMilestone}
                  onDelete={onDeleteMilestone}
                />
              </div>
            </CardContent>
          </Card>
        );
      }))}
    </div>
  );
}
