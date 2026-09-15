"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { WheelOfLife } from "@/components/objetivos/WheelOfLife";
import { GoalsList } from "@/components/objetivos/GoalsList";
import { DreamsList } from "@/components/objetivos/DreamsList";
import { getGoals, getWheelOfLife, getDreams } from "@/lib/api";
import { Goal, WheelArea, Dream } from "@/lib/types";
import { Target, User, Briefcase, Sparkles, Compass } from "lucide-react";

export default function ObjetivosPage() {
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [wheel, setWheel] = React.useState<WheelArea[]>([]);
  const [dreams, setDreams] = React.useState<Dream[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      try {
        const [gData, wData, dData] = await Promise.all([
          getGoals(),
          getWheelOfLife(),
          getDreams(),
        ]);
        setGoals(gData);
        setWheel(wData);
        setDreams(dData);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-zinc-900 rounded-lg w-1/3" />
        <div className="h-80 bg-zinc-900 rounded-xl" />
        <div className="h-64 bg-zinc-900 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-violet-400 uppercase tracking-widest mb-1">
          <Target className="h-3.5 w-3.5" /> Visión Estratégica
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
          Objetivos & Metas
        </h1>
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
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Compass className="h-5 w-5 text-violet-400" /> Metas Clave
          </h2>
        </div>

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
            <GoalsList category="personal" initialGoals={goals} />
          </TabsContent>

          <TabsContent value="professional" className="mt-4">
            <GoalsList category="professional" initialGoals={goals} />
          </TabsContent>
        </Tabs>
      </section>

      {/* 3. Lista de Sueños por Cumplir (Bucket List) */}
      <section aria-labelledby="lista-suenos-heading">
        <DreamsList initialDreams={dreams} />
      </section>
    </div>
  );
}
