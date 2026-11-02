"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GoalsList } from "./GoalsList";
import { NewGoalForm } from "./NewGoalForm";
import { useGoals } from "./useGoals";
import type { Goal, GoalCategory } from "@/lib/types";
import { User, Briefcase } from "lucide-react";

export function GoalsTabs({ initialGoals }: { initialGoals: Goal[] }) {
  const { goals, addGoal, toggleMilestone, addMilestone, deleteMilestone, deleteGoal } = useGoals(initialGoals);
  const [category, setCategory] = React.useState<GoalCategory>("personal");

  const list = (value: GoalCategory) => (
    <GoalsList
      category={value}
      goals={goals}
      onToggleMilestone={toggleMilestone}
      onAddMilestone={addMilestone}
      onDeleteMilestone={deleteMilestone}
      onDeleteGoal={deleteGoal}
    />
  );

  return (
    <Tabs value={category} onValueChange={(v) => setCategory(v as GoalCategory)} className="w-full">
      <TabsList className="bg-zinc-900 border border-zinc-800">
        <TabsTrigger value="personal" className="gap-2">
          <User className="h-3.5 w-3.5" /> Personal
        </TabsTrigger>
        <TabsTrigger value="professional" className="gap-2">
          <Briefcase className="h-3.5 w-3.5" /> Profesional
        </TabsTrigger>
      </TabsList>

      <NewGoalForm category={category} onAdd={addGoal} />

      <TabsContent value="personal" className="mt-4">
        {list("personal")}
      </TabsContent>

      <TabsContent value="professional" className="mt-4">
        {list("professional")}
      </TabsContent>
    </Tabs>
  );
}
