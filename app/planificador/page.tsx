import { WeeklyKanban } from "@/components/planificador/WeeklyKanban";
import { getPlannerData } from "@/lib/data";

export default async function PlanificadorPage() {
  const data = await getPlannerData();

  return (
    <div className="pb-12">
      <WeeklyKanban initialData={data} />
    </div>
  );
}
