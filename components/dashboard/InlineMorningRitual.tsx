"use client";

import * as React from "react";
import type { MorningRitual, EnergyLevel } from "@/lib/types";
import { updateMorningRitualAction } from "@/app/actions/profile";
import { useToast } from "@/components/ui/toast";
import { useServerState } from "@/lib/client-hooks";
import { cn } from "@/lib/utils";
import { Target, Zap, ShieldCheck, Edit2, BatteryCharging, ListChecks } from "lucide-react";

interface InlineMorningRitualProps {
  initialData: MorningRitual;
}

type Field = "mission" | "frog" | "pillar";

const ENERGY_OPTIONS: { level: EnergyLevel; label: string; color: string; bg: string }[] = [
  { level: "low", label: "Baja", color: "text-zinc-300", bg: "bg-zinc-800" },
  { level: "medium", label: "Media", color: "text-amber-400", bg: "bg-amber-500/10" },
  { level: "high", label: "Alta", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { level: "peak", label: "Máxima", color: "text-violet-400", bg: "bg-violet-500/10" },
];

const FIELDS: {
  key: Field;
  label: string;
  placeholder: string;
  icon: typeof Target;
  accent: { label: string; hover: string; ring: string; check: string };
}[] = [
  {
    key: "mission",
    label: "Objetivo del día",
    placeholder: "¿Qué querés lograr hoy?",
    icon: Target,
    accent: { label: "text-violet-400", hover: "hover:border-violet-500/30", ring: "border-violet-500", check: "accent-violet-500" },
  },
  {
    key: "frog",
    label: "Tarea más importante",
    placeholder: "La que más impacto tiene, aunque sea la que más cuesta.",
    icon: Zap,
    accent: { label: "text-emerald-400", hover: "hover:border-emerald-500/30", ring: "border-emerald-500", check: "accent-emerald-500" },
  },
  {
    key: "pillar",
    label: "Cómo vas a trabajar",
    placeholder: "Por ejemplo: sin celular hasta el mediodía.",
    icon: ShieldCheck,
    accent: { label: "text-amber-400", hover: "hover:border-amber-500/30", ring: "border-amber-500", check: "accent-amber-500" },
  },
];

export function InlineMorningRitual({ initialData }: InlineMorningRitualProps) {
  const toast = useToast();
  // Se reemplaza cuando el Server Component revalida y envía datos frescos.
  const [data, setData] = useServerState<MorningRitual>(initialData);
  const [done, setDone] = React.useState<Record<Field, boolean>>({ mission: false, frog: false, pillar: false });
  const [editingField, setEditingField] = React.useState<Field | null>(null);
  const [tempValue, setTempValue] = React.useState("");

  const handleStartEdit = (field: Field) => {
    setEditingField(field);
    setTempValue(data[field] || "");
  };

  const handleSaveField = async (field: Field) => {
    const val = tempValue.trim();
    setEditingField(null);
    if (!val || val === data[field]) return;

    const previousValue = data[field];
    setData((prev) => ({ ...prev, [field]: val }));

    const res = await updateMorningRitualAction({ [field]: val });
    if (!res.ok) {
      // Se revierte solo este campo.
      setData((prev) => ({ ...prev, [field]: previousValue }));
      toast.error(res.error);
    }
  };

  const handleEnergyChange = async (level: EnergyLevel) => {
    const previousLevel = data.energyLevel;
    if (previousLevel === level) return;
    setData((prev) => ({ ...prev, energyLevel: level }));

    const res = await updateMorningRitualAction({ energyLevel: level });
    if (!res.ok) {
      setData((prev) => ({ ...prev, energyLevel: previousLevel }));
      toast.error(res.error);
    }
  };

  return (
    <div className="w-full rounded-[22px] border border-white/[0.08] bg-zinc-900/60 backdrop-blur-xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] space-y-4">
      <div className="space-y-3 border-b border-white/[0.06] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <ListChecks className="h-4 w-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Prioridades de hoy</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">Tocá una tarjeta para escribir o cambiar el texto.</p>
        </div>

        {/* Nivel de energía: en su propia fila para que no se corte en pantallas medianas */}
        <div className="flex flex-wrap items-center gap-1 bg-zinc-950/70 p-1 rounded-xl border border-white/10 w-fit max-w-full">
          <span className="text-xs text-zinc-400 font-medium px-2 flex items-center gap-1">
            <BatteryCharging className="h-3.5 w-3.5 text-violet-400" /> Energía
          </span>
          {ENERGY_OPTIONS.map((opt) => (
            <button
              key={opt.level}
              type="button"
              onClick={() => handleEnergyChange(opt.level)}
              aria-pressed={data.energyLevel === opt.level}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                data.energyLevel === opt.level
                  ? `${opt.bg} ${opt.color} ring-1 ring-white/10`
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {FIELDS.map(({ key, label, placeholder, icon: Icon, accent }) => {
          const value = data[key];
          return (
            <div
              key={key}
              className={cn(
                "rounded-2xl bg-zinc-950/60 border border-white/[0.06] p-3.5 transition-colors group/card",
                accent.hover
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-1.5", accent.label)}>
                  <Icon className="h-3.5 w-3.5" /> {label}
                </span>
                {value && (
                  <input
                    type="checkbox"
                    checked={done[key]}
                    onChange={(e) => setDone((prev) => ({ ...prev, [key]: e.target.checked }))}
                    aria-label={`Marcar "${label}" como cumplido`}
                    className={cn("w-4 h-4 rounded cursor-pointer bg-zinc-800 border-zinc-700", accent.check)}
                  />
                )}
              </div>

              {editingField === key ? (
                <textarea
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  onBlur={() => handleSaveField(key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSaveField(key);
                    }
                    if (e.key === "Escape") setEditingField(null);
                  }}
                  rows={2}
                  maxLength={300}
                  autoFocus
                  placeholder={placeholder}
                  aria-label={label}
                  className={cn(
                    "w-full bg-zinc-900 border rounded-xl p-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none resize-none",
                    accent.ring
                  )}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => handleStartEdit(key)}
                  className="w-full text-left cursor-pointer py-0.5"
                >
                  <p
                    className={cn(
                      "text-sm leading-snug transition-all",
                      !value && "text-zinc-500 italic",
                      value && (done[key] ? "line-through text-zinc-500" : "text-zinc-200 font-medium")
                    )}
                  >
                    {value || placeholder}
                  </p>
                  <span className="text-xs text-zinc-500 flex items-center gap-1 mt-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                    <Edit2 className="h-3 w-3" /> {value ? "Editar" : "Escribir"}
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
