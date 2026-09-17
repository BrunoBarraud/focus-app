"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MorningRitual as MorningRitualType, EnergyLevel } from "@/lib/types";
import { updateUserSettings } from "@/app/actions";
import { SunMedium, Compass, Target, BatteryCharging, CheckCircle2, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MorningRitualProps {
  initialData: MorningRitualType;
}

const ENERGY_OPTIONS: { level: EnergyLevel; label: string; bg: string }[] = [
  { level: "low", label: "Bajo", bg: "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border-zinc-700/60" },
  { level: "medium", label: "Medio", bg: "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30" },
  { level: "high", label: "Alto", bg: "bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border-teal-500/30" },
  { level: "peak", label: "Imparable", bg: "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40" },
];

/** Campo de texto inline editable con auto-guardado en Supabase */
function EditableField({
  value,
  onSave,
  label,
  color,
  icon: Icon,
}: {
  value: string;
  onSave: (val: string) => Promise<void>;
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const [saving, setSaving] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSave = async () => {
    if (!draft.trim() || draft === value) {
      setEditing(false);
      setDraft(value);
      return;
    }
    setSaving(true);
    try {
      await onSave(draft.trim());
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setEditing(false);
      setDraft(value);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 transition-all hover:border-zinc-700/60 group/field">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className={cn("flex items-center gap-2 text-xs font-semibold uppercase tracking-wider", color)}>
          <Icon className="h-4 w-4" /> {label}
        </div>
        {!editing && (
          <button
            onClick={() => { setEditing(true); setDraft(value); }}
            className="opacity-0 group-hover/field:opacity-100 transition-opacity p-1 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300"
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={saving}
            className="flex-1 bg-zinc-950 border border-violet-500/50 rounded-lg px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-400 hover:bg-violet-500/20 transition-colors cursor-pointer"
          >
            {saving ? <span className="h-3.5 w-3.5 block rounded-full border-2 border-violet-400 border-t-transparent animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => { setEditing(false); setDraft(value); }}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <p className="text-sm text-zinc-200 font-medium leading-relaxed">{value}</p>
      )}
    </div>
  );
}

export function MorningRitual({ initialData }: MorningRitualProps) {
  const [data, setData] = React.useState<MorningRitualType>(initialData);
  const [isFrogDone, setIsFrogDone] = React.useState(false);

  // Persistir nivel de energía
  const handleEnergyChange = async (level: EnergyLevel) => {
    setData((prev) => ({ ...prev, energyLevel: level }));
    try {
      await updateUserSettings({ energy_level: level });
    } catch {
      // Revertir si falla
      setData((prev) => ({ ...prev, energyLevel: data.energyLevel }));
    }
  };

  // Guardar misión en Supabase
  const handleSaveMission = async (val: string) => {
    await updateUserSettings({ daily_mission: val });
    setData((prev) => ({ ...prev, mission: val }));
  };

  // Guardar pilar en Supabase
  const handleSavePillar = async (val: string) => {
    await updateUserSettings({ daily_pillar: val });
    setData((prev) => ({ ...prev, pillar: val }));
  };

  // Guardar SAPO en Supabase
  const handleSaveFrog = async (val: string) => {
    await updateUserSettings({ daily_frog: val });
    setData((prev) => ({ ...prev, frog: val }));
  };

  return (
    <Card className="border-zinc-800/80 bg-gradient-to-br from-zinc-900/90 via-zinc-950 to-zinc-900/60 shadow-lg relative overflow-hidden group">
      {/* Subtle top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-600/70 via-fuchsia-500/60 to-indigo-500/60" />

      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 shadow-inner">
              <SunMedium className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                Priorities
                <Badge variant="outline" className="text-[10px] py-0 px-2 uppercase font-semibold text-violet-300 border-violet-500/30 bg-violet-500/10">
                  Hoy
                </Badge>
              </CardTitle>
              <CardDescription className="capitalize">{data.date}</CardDescription>
            </div>
          </div>

          {/* Energy Level Selector */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-zinc-900/80 p-1 rounded-lg border border-zinc-800">
            <span className="text-[11px] text-zinc-400 px-2 flex items-center gap-1">
              <BatteryCharging className="h-3.5 w-3.5 text-zinc-400" /> Energía:
            </span>
            {ENERGY_OPTIONS.map((opt) => {
              const isSelected = data.energyLevel === opt.level;
              return (
                <button
                  key={opt.level}
                  type="button"
                  onClick={() => handleEnergyChange(opt.level)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-md transition-all font-medium select-none cursor-pointer border",
                    isSelected
                      ? `${opt.bg} shadow-sm font-semibold`
                      : "text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-800/50"
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Mission & Pillar Grid — editables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <EditableField
            value={data.mission}
            onSave={handleSaveMission}
            label="Misión de Hoy"
            color="text-violet-400"
            icon={Target}
          />
          <EditableField
            value={data.pillar}
            onSave={handleSavePillar}
            label="Pilar del Día"
            color="text-amber-400"
            icon={Compass}
          />
        </div>

        {/* El SAPO de Hoy — editable + toggle completado */}
        <div
          className={cn(
            "rounded-xl border p-4 transition-all duration-200 group/frog",
            isFrogDone
              ? "border-emerald-500/30 bg-emerald-950/10"
              : "border-rose-500/30 bg-rose-950/10 hover:border-rose-500/50"
          )}
        >
          <div className="flex items-start gap-3.5">
            {/* Checkbox toggle */}
            <button
              type="button"
              onClick={() => setIsFrogDone(!isFrogDone)}
              className={cn(
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all cursor-pointer",
                isFrogDone
                  ? "border-emerald-500 bg-emerald-500 text-zinc-950"
                  : "border-rose-500/50 text-transparent hover:border-rose-400"
              )}
            >
              <CheckCircle2 className="h-4 w-4" />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  🐸 El SAPO del Día (Eat That Frog)
                </span>
                <span className="text-[11px] text-zinc-400 shrink-0">
                  {isFrogDone ? "¡Gran victoria!" : "Prioridad Absoluta"}
                </span>
              </div>

              {/* SAPO editable */}
              <EditableField
                value={data.frog}
                onSave={handleSaveFrog}
                label=""
                color="text-rose-400"
                icon={() => null}
              />

              {isFrogDone && (
                <p className="text-xs text-emerald-400 mt-2 font-medium">
                  ✓ Completado — la tarea más difícil ya está hecha.
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
