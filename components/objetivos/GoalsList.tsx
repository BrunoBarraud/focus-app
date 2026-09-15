"use client";

import * as React from "react";
import { Goal, GoalCategory } from "@/lib/types";
import { toggleMilestone } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Calendar, Target, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoalsListProps {
  category: GoalCategory;
  initialGoals: Goal[];
}

export function GoalsList({ category, initialGoals }: GoalsListProps) {
  const [goals, setGoals] = React.useState<Goal[]>(initialGoals);

  const filteredGoals = goals.filter((g) => g.category === category);

  const handleToggleMilestone = async (goalId: string, milestoneId: string) => {
    const updated = await toggleMilestone(goalId, milestoneId);
    setGoals(updated);
  };

  return (
    <div className="space-y-4">
      {filteredGoals.length === 0 ? (
        <Card className="border-dashed border-zinc-800 bg-zinc-950/40 p-8 text-center">
          <Target className="h-8 w-8 text-zinc-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-zinc-200">
            No tienes metas {category === "personal" ? "personales" : "profesionales"} registradas.
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Los objetivos claros te dan una dirección implacable hacia donde enfocar tu energía.
          </p>
        </Card>
      ) : (
        filteredGoals.map((goal) => {
        const completedMilestones = goal.milestones.filter((m) => m.completed).length;

        return (
          <Card
            key={goal.id}
            className="border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700/70 transition-all"
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
                      <Badge variant="outline" className="text-[10px] py-0 px-2 border-violet-500/30 text-violet-300">
                        {goal.timeframe}
                      </Badge>
                      <span className="text-xs text-zinc-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-violet-400" /> Meta: {goal.targetDate}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span className="font-mono text-sm font-bold text-violet-400">
                    {goal.progress}%
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 pt-0">
              <Progress
                value={goal.progress}
                className="h-2 bg-zinc-800/80"
                indicatorClassName="bg-gradient-to-r from-violet-600 via-fuchsia-400 to-indigo-400"
              />

              {/* Milestones checklist */}
              <div className="space-y-1.5 pt-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Hitos clave ({completedMilestones}/{goal.milestones.length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {goal.milestones.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleToggleMilestone(goal.id, m.id)}
                      className={cn(
                        "flex items-start gap-2.5 p-2 rounded-lg border text-left transition-all cursor-pointer select-none",
                        m.completed
                          ? "bg-emerald-950/20 border-emerald-500/30 text-zinc-300"
                          : "bg-zinc-900/50 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors",
                          m.completed
                            ? "bg-emerald-500 border-emerald-500 text-zinc-950"
                            : "border-zinc-600 text-transparent"
                        )}
                      >
                        <CheckCircle2 className="h-2.5 w-2.5 fill-current" />
                      </div>
                      <span
                        className={cn(
                          "text-xs leading-tight",
                          m.completed && "line-through text-zinc-400"
                        )}
                      >
                        {m.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      }))}
    </div>
  );
}
