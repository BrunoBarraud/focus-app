import { CalendarApp } from "@/components/calendario/CalendarApp";
import { defaultPlannerRange, getPlannerData } from "@/lib/data";

export default async function PlanificadorPage() {
  const range = defaultPlannerRange();
  const data = await getPlannerData(range);

  return (
    <div className="pb-12">
      <CalendarApp initialData={data} initialRange={range} />
    </div>
  );
}
