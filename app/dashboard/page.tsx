import { DashboardInteractive } from "@/components/dashboard/DashboardInteractive";
import { getViewer } from "@/lib/auth";
import { defaultPlannerRange, getGoals, getHabits, getInactivityReminder, getMorningRitual, getPlannerData } from "@/lib/data";

export default async function DashboardPage() {
  const plannerRange = defaultPlannerRange();
  // En paralelo (antes eran 5 consultas en serie). Si alguna falla, se muestra
  // app/error.tsx en lugar de datos de demo haciéndose pasar por reales.
  const [viewer, habits, planner, goals, ritual, inactivityHours] = await Promise.all([
    getViewer(),
    getHabits(),
    getPlannerData(plannerRange),
    getGoals(),
    getMorningRitual(),
    getInactivityReminder(),
  ]);

  return (
    <DashboardInteractive
      initialHabits={habits}
      initialPlanner={planner}
      plannerRange={plannerRange}
      initialGoals={goals}
      initialRitual={ritual}
      initialInactivityHours={inactivityHours}
      userName={viewer?.firstName ?? "Usuario"}
    />
  );
}
