"use client";

import {
  addGoalAction,
  addMilestoneAction,
  deleteGoalAction,
  deleteMilestoneAction,
  setMilestoneAction,
} from "@/app/actions/goals";
import { useToast } from "@/components/ui/toast";
import { parseIsoDate } from "@/lib/dates";
import { progressOf } from "@/lib/mappers";
import type { Goal, GoalCategory, GoalTimeframe } from "@/lib/types";
import { useServerState } from "@/lib/client-hooks";

const TEMP_PREFIX = "temp-";
export const isTempId = (id: string) => id.startsWith(TEMP_PREFIX);

function withProgress(goal: Goal): Goal {
  return { ...goal, progress: progressOf(goal.milestones) };
}

export function formatTargetDate(targetDate: string | null): string {
  if (!targetDate) return "Sin fecha límite";
  return parseIsoDate(targetDate).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

/** Trimestre en curso, para proponerlo por defecto al crear una meta. */
export function currentQuarter(): GoalTimeframe {
  return `Q${Math.floor(new Date().getMonth() / 3) + 1}` as GoalTimeframe;
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
    if (!goal || !milestone || isTempId(goalId) || isTempId(milestoneId)) return;
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

  const addMilestone = async (goalId: string, title: string) => {
    const clean = title.trim();
    if (!clean || isTempId(goalId)) return false;
    const tempId = `${TEMP_PREFIX}${crypto.randomUUID()}`;
    updateGoal(goalId, (g) =>
      withProgress({ ...g, milestones: [...g.milestones, { id: tempId, title: clean, completed: false }] })
    );

    const res = await addMilestoneAction(goalId, clean);
    if (res.ok) {
      updateGoal(goalId, (g) => ({
        ...g,
        progress: res.data.progress,
        milestones: g.milestones.map((m) => (m.id === tempId ? res.data.milestone : m)),
      }));
      return true;
    }
    updateGoal(goalId, (g) => withProgress({ ...g, milestones: g.milestones.filter((m) => m.id !== tempId) }));
    toast.error(res.error);
    return false;
  };

  const deleteMilestone = async (goalId: string, milestoneId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    const index = goal?.milestones.findIndex((m) => m.id === milestoneId) ?? -1;
    if (!goal || index === -1 || isTempId(milestoneId)) return;
    const removed = goal.milestones[index];

    updateGoal(goalId, (g) => withProgress({ ...g, milestones: g.milestones.filter((m) => m.id !== milestoneId) }));
    const res = await deleteMilestoneAction(milestoneId);
    if (!res.ok) {
      updateGoal(goalId, (g) => {
        const milestones = [...g.milestones];
        milestones.splice(Math.min(index, milestones.length), 0, removed);
        return withProgress({ ...g, milestones });
      });
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

  return { goals, addGoal, toggleMilestone, addMilestone, deleteMilestone, deleteGoal };
}
