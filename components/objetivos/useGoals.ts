"use client";

import { addGoalAction, deleteGoalAction, setMilestoneAction } from "@/app/actions/goals";
import { useToast } from "@/components/ui/toast";
import { parseIsoDate } from "@/lib/dates";
import type { Goal, GoalCategory, GoalTimeframe } from "@/lib/types";
import { useServerState } from "@/lib/client-hooks";

const TEMP_PREFIX = "temp-";
export const isTempId = (id: string) => id.startsWith(TEMP_PREFIX);

function withProgress(goal: Goal): Goal {
  const total = goal.milestones.length;
  const done = goal.milestones.filter((m) => m.completed).length;
  return { ...goal, progress: total ? Math.round((done / total) * 100) : goal.progress };
}

export function formatTargetDate(targetDate: string | null): string {
  if (!targetDate) return "Sin fecha límite";
  return parseIsoDate(targetDate).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

/** Metas con hitos reales, compartidas por el dashboard y /objetivos. */
export function useGoals(initialGoals: Goal[]) {
  const toast = useToast();
  const [goals, setGoals] = useServerState<Goal[]>(initialGoals);

  const updateGoal = (id: string, fn: (g: Goal) => Goal) =>
    setGoals((prev) => prev.map((g) => (g.id === id ? fn(g) : g)));

  const addGoal = async (input: {
    title: string;
    category: GoalCategory;
    timeframe: GoalTimeframe;
    targetDate?: string | null;
  }) => {
    const tempId = `${TEMP_PREFIX}${crypto.randomUUID()}`;
    setGoals((prev) => [
      { id: tempId, progress: 0, milestones: [], targetDate: input.targetDate ?? null, ...input },
      ...prev,
    ]);
    const res = await addGoalAction(input);
    if (res.ok) {
      setGoals((prev) => prev.map((g) => (g.id === tempId ? res.data : g)));
      return true;
    }
    setGoals((prev) => prev.filter((g) => g.id !== tempId));
    toast.error(res.error);
    return false;
  };

  const toggleMilestone = async (goalId: string, milestoneId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    const milestone = goal?.milestones.find((m) => m.id === milestoneId);
    if (!goal || !milestone || isTempId(goalId)) return;
    const next = !milestone.completed;

    const flip = (completed: boolean) =>
      updateGoal(goalId, (g) =>
        withProgress({
          ...g,
          milestones: g.milestones.map((m) => (m.id === milestoneId ? { ...m, completed } : m)),
        })
      );

    flip(next);
    const res = await setMilestoneAction(milestoneId, next);
    if (!res.ok) {
      flip(!next);
      toast.error(res.error);
    }
  };

  const deleteGoal = async (goalId: string) => {
    const index = goals.findIndex((g) => g.id === goalId);
    if (index === -1 || isTempId(goalId)) return;
    const removed = goals[index];
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    const res = await deleteGoalAction(goalId);
    if (!res.ok) {
      setGoals((prev) => {
        const copy = [...prev];
        copy.splice(Math.min(index, copy.length), 0, removed);
        return copy;
      });
      toast.error(res.error);
    }
  };

  return { goals, addGoal, toggleMilestone, deleteGoal };
}
