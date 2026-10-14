import { DashboardInteractive } from "@/components/dashboard/DashboardInteractive";
import { getViewer } from "@/lib/auth";
import { getGoals, getHabits, getMorningRitual, getPlannerData } from "@/lib/data";

export default async function DashboardPage() {
  // En paralelo (antes eran 5 consultas en serie). Si alguna falla, se muestra
  // app/error.tsx en lugar de datos de demo haciéndose pasar por reales.
  const [viewer, habits, planner, goals, ritual] = await Promise.all([
    getViewer(),
    getHabits(),
    getPlannerData(),
    getGoals(),
    getMorningRitual(),
  ]);

  return (
    <DashboardInteractive
      initialHabits={habits}
      initialPlanner={planner}
      initialGoals={goals}
      initialRitual={ritual}
      userName={viewer?.firstName ?? "Usuario"}
    />
  );
}
