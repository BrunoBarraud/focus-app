import { WheelOfLife } from "@/components/objetivos/WheelOfLife";
import { GoalsTabs } from "@/components/objetivos/GoalsTabs";
import { DreamsList } from "@/components/objetivos/DreamsList";
import { getDreams, getGoals, getWheelOfLife } from "@/lib/data";
import { Target, Compass } from "lucide-react";

export default async function ObjetivosPage() {
  const [goals, wheel, dreams] = await Promise.all([getGoals(), getWheelOfLife(), getDreams()]);

  return (
    <div className="space-y-10 pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-violet-400 uppercase tracking-widest mb-1">
          <Target className="h-3.5 w-3.5" /> Visión Estratégica
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">Objetivos & Metas</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Alineación entre tus proyectos profesionales, tu equilibrio vital y tus grandes sueños.
        </p>
      </div>

      {/* 1. Radar Chart: Rueda de la Vida */}
      <section aria-labelledby="rueda-vida-heading">
        <WheelOfLife initialAreas={wheel} />
      </section>

      {/* 2. Tabs Personal / Profesional */}
      <section className="space-y-4" aria-labelledby="metas-heading">
        <div className="flex items-center justify-between">
          <h2 id="metas-heading" className="text-xl font-bold text-white flex items-center gap-2">
            <Compass className="h-5 w-5 text-violet-400" /> Metas Clave
          </h2>
        </div>
        <GoalsTabs initialGoals={goals} />
      </section>

      {/* 3. Lista de Sueños por Cumplir (Bucket List) */}
      <section aria-labelledby="lista-suenos-heading">
        <DreamsList initialDreams={dreams} />
      </section>
    </div>
  );
}
