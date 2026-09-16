"use client";

import * as React from "react";
import { MorningRitual, EnergyLevel } from "@/lib/types";
import { updateMorningRitualAction } from "@/app/actions";
import { Sparkles, Target, Zap, ShieldCheck, Check, Edit2, Battery, BatteryCharging } from "lucide-react";

interface InlineMorningRitualProps {
  initialData: MorningRitual;
}

const ENERGY_OPTIONS: { level: EnergyLevel; label: string; color: string; bg: string }[] = [
  { level: "low", label: "Baja", color: "text-zinc-400", bg: "bg-zinc-800" },
  { level: "medium", label: "Media", color: "text-amber-400", bg: "bg-amber-500/10" },
  { level: "high", label: "Alta", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { level: "peak", label: "Pico", color: "text-violet-400", bg: "bg-violet-500/10" },
];

export function InlineMorningRitual({ initialData }: InlineMorningRitualProps) {
  const [data, setData] = React.useState<MorningRitual>(initialData);
  
  // Estados de completitud de cada sección (checkbox nativo tintado)
  const [missionDone, setMissionDone] = React.useState(false);
  const [frogDone, setFrogDone] = React.useState(false);
  const [pillarDone, setPillarDone] = React.useState(false);

  // Estados de edición inline
  const [editingField, setEditingField] = React.useState<"mission" | "frog" | "pillar" | null>(null);
  const [tempValue, setTempValue] = React.useState<string>("");

  // Sincronizar estado cuando el Server Component revalida y envía datos frescos
  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Iniciar edición inline con un clic
  const handleStartEdit = (field: "mission" | "frog" | "pillar") => {
    setEditingField(field);
    setTempValue(data[field] || "");
  };

  // Guardar en Supabase en background con Server Action y rollback
  const handleSaveField = async (field: "mission" | "frog" | "pillar") => {
    if (!tempValue.trim()) {
      setEditingField(null);
      return;
    }
    const val = tempValue.trim();
    setEditingField(null);

    const previousData = data;
    const updated = { ...data, [field]: val };
    setData(updated);

    try {
      const res = await updateMorningRitualAction({ [field]: val });
      if (res?.error) {
        console.error("Error al actualizar ritual:", res.error);
        setData(previousData);
      }
    } catch (err) {
      console.error("Error al actualizar ritual:", err);
      setData(previousData);
    }
  };

  // Cambiar nivel de energía con Server Action y rollback
  const handleEnergyChange = async (level: EnergyLevel) => {
    const previousData = data;
    setData((prev) => ({ ...prev, energyLevel: level }));

    try {
      const res = await updateMorningRitualAction({ energyLevel: level });
      if (res?.error) {
        console.error("Error al actualizar energía:", res.error);
        setData(previousData);
      }
    } catch (err) {
      console.error("Error al actualizar energía:", err);
      setData(previousData);
    }
  };

  return (
    <div className="w-full rounded-[22px] border border-white/[0.08] bg-zinc-900/60 backdrop-blur-xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Ritual Matutino
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Define tu claridad del día. Edición con un solo clic.
          </p>
        </div>

        {/* Selector de Nivel de Energía */}
        <div className="flex items-center gap-1 bg-zinc-950/70 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
          <span className="text-[10px] text-zinc-500 uppercase font-semibold px-2 flex items-center gap-1">
            <BatteryCharging className="h-3 w-3 text-amber-400" /> Energía:
          </span>
          {ENERGY_OPTIONS.map((opt) => (
            <button
              key={opt.level}
              type="button"
              onClick={() => handleEnergyChange(opt.level)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                data.energyLevel === opt.level
                  ? `${opt.bg} ${opt.color} ring-1 ring-white/10`
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Los 3 Bloques: Misión, Sapo y Pilar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Misión del Día */}
        <div className="rounded-2xl bg-zinc-950/60 border border-white/[0.06] p-4 flex flex-col justify-between hover:border-violet-500/30 transition-colors group/card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" /> Misión de Hoy
            </span>
            <input
              type="checkbox"
              checked={missionDone}
              onChange={(e) => setMissionDone(e.target.checked)}
              title="Marcar misión como completada"
              className="w-4 h-4 rounded cursor-pointer accent-violet-500 bg-zinc-800 border-zinc-700"
            />
          </div>

          <div className="flex-1 my-1">
            {editingField === "mission" ? (
              <textarea
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={() => handleSaveField("mission")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveField("mission");
                  }
                }}
                rows={3}
                autoFocus
                className="w-full bg-zinc-900 border border-violet-500 rounded-xl p-2 text-xs text-white focus:outline-none resize-none"
              />
            ) : (
              <div
                onClick={() => handleStartEdit("mission")}
                className="cursor-pointer group/text py-1"
                title="Haz clic para editar la misión"
              >
                <p
                  className={`text-xs sm:text-sm font-medium leading-relaxed transition-all ${
                    missionDone ? "line-through text-zinc-500" : "text-zinc-200"
                  }`}
                >
                  {data.mission}
                </p>
                <span className="text-[10px] text-zinc-500 flex items-center gap-1 mt-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                  <Edit2 className="h-2.5 w-2.5" /> Clic para editar
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 2. El Sapo del Día (Prioridad Crítica) */}
        <div className="rounded-2xl bg-zinc-950/60 border border-white/[0.06] p-4 flex flex-col justify-between hover:border-emerald-500/30 transition-colors group/card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" /> El Sapo (Prioridad)
            </span>
            <input
              type="checkbox"
              checked={frogDone}
              onChange={(e) => setFrogDone(e.target.checked)}
              title="Marcar sapo como devorado"
              className="w-4 h-4 rounded cursor-pointer accent-emerald-500 bg-zinc-800 border-zinc-700"
            />
          </div>

          <div className="flex-1 my-1">
            {editingField === "frog" ? (
              <textarea
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={() => handleSaveField("frog")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveField("frog");
                  }
                }}
                rows={3}
                autoFocus
                className="w-full bg-zinc-900 border border-emerald-500 rounded-xl p-2 text-xs text-white focus:outline-none resize-none"
              />
            ) : (
              <div
                onClick={() => handleStartEdit("frog")}
                className="cursor-pointer group/text py-1"
                title="Haz clic para editar el sapo"
              >
                <p
                  className={`text-xs sm:text-sm font-medium leading-relaxed transition-all ${
                    frogDone ? "line-through text-zinc-500" : "text-zinc-200"
                  }`}
                >
                  {data.frog}
                </p>
                <span className="text-[10px] text-zinc-500 flex items-center gap-1 mt-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                  <Edit2 className="h-2.5 w-2.5" /> Clic para editar
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Pilar del Día */}
        <div className="rounded-2xl bg-zinc-950/60 border border-white/[0.06] p-4 flex flex-col justify-between hover:border-blue-500/30 transition-colors group/card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Pilar de Enfoque
            </span>
            <input
              type="checkbox"
              checked={pillarDone}
              onChange={(e) => setPillarDone(e.target.checked)}
              title="Marcar pilar como interiorizado"
              className="w-4 h-4 rounded cursor-pointer accent-blue-500 bg-zinc-800 border-zinc-700"
            />
          </div>

          <div className="flex-1 my-1">
            {editingField === "pillar" ? (
              <textarea
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={() => handleSaveField("pillar")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveField("pillar");
                  }
                }}
                rows={3}
                autoFocus
                className="w-full bg-zinc-900 border border-blue-500 rounded-xl p-2 text-xs text-white focus:outline-none resize-none"
              />
            ) : (
              <div
                onClick={() => handleStartEdit("pillar")}
                className="cursor-pointer group/text py-1"
                title="Haz clic para editar el pilar"
              >
                <p
                  className={`text-xs sm:text-sm font-medium leading-relaxed transition-all ${
                    pillarDone ? "line-through text-zinc-500" : "text-zinc-200"
                  }`}
                >
                  {data.pillar}
                </p>
                <span className="text-[10px] text-zinc-500 flex items-center gap-1 mt-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                  <Edit2 className="h-2.5 w-2.5" /> Clic para editar
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
