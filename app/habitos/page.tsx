import { HabitMatrix } from "@/components/habitos/HabitMatrix";
import { getHabits } from "@/lib/data";

export default async function HabitosPage() {
  const habits = await getHabits();

  return (
    <div className="pb-12">
      <HabitMatrix initialHabits={habits} />
    </div>
  );
}
