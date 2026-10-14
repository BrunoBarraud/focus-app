"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GoalsList } from "./GoalsList";
import { useGoals } from "./useGoals";
import type { Goal } from "@/lib/types";
import { User, Briefcase } from "lucide-react";

export function GoalsTabs({ initialGoals }: { initialGoals: Goal[] }) {
  const { goals, toggleMilestone } = useGoals(initialGoals);

  return (
    <Tabs defaultValue="personal" className="w-full">
      <TabsList className="bg-zinc-900 border border-zinc-800">
        <TabsTrigger value="personal" className="gap-2">
          <User className="h-3.5 w-3.5" /> Personal
        </TabsTrigger>
        <TabsTrigger value="professional" className="gap-2">
          <Briefcase className="h-3.5 w-3.5" /> Profesional
        </TabsTrigger>
      </TabsList>

      <TabsContent value="personal" className="mt-4">
        <GoalsList category="personal" goals={goals} onToggleMilestone={toggleMilestone} />
      </TabsContent>

      <TabsContent value="professional" className="mt-4">
        <GoalsList category="professional" goals={goals} onToggleMilestone={toggleMilestone} />
      </TabsContent>
    </Tabs>
  );
}
