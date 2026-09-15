"use client";

import * as React from "react";
import { Dream } from "@/lib/types";
import { toggleDreamStatus, addDream } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import confetti from "canvas-confetti";
import { Sparkles, Plus, CheckCircle, Clock, CircleAlert, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

interface DreamsListProps {
  initialDreams: Dream[];
}

export function DreamsList({ initialDreams }: DreamsListProps) {
  const [dreams, setDreams] = React.useState<Dream[]>(initialDreams);
  const [filter, setFilter] = React.useState<string>("all");
  const [isAddOpen, setIsAddOpen] = React.useState(false);

  // Form states
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState<Dream["category"]>("Experiencias");
  const [targetYear, setTargetYear] = React.useState(2028);

  const filteredDreams = dreams.filter((d) =>
    filter === "all" ? true : d.status === filter
  );

  const handleStatusChange = async (dreamId: string, nextStatus: Dream["status"]) => {
    if (nextStatus === "completed") {
      // Trigger confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#10b981", "#34d399", "#fbbf24", "#38bdf8"],
        });
      } catch (err) {
        // Fallback silently if confetti is blocked
      }
    }

    const updated = await toggleDreamStatus(dreamId, nextStatus);
    setDreams(updated);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const updated = await addDream({
      title: title.trim(),
      description: description.trim(),
      category,
      status: "pending",
      targetYear: Number(targetYear) || 2028,
    });

    setDreams(updated);
    setTitle("");
    setDescription("");
    setIsAddOpen(false);
  };

  const completedCount = dreams.filter((d) => d.status === "completed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-widest mb-1">
            <Sparkles className="h-3.5 w-3.5" /> Bucket List de Vida
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Lista de Sueños por Cumplir
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Aspiraciones mayores para no perder de vista el propósito de tu esfuerzo.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300">
            <span className="text-zinc-400">Cumplidos: </span>
            <strong className="text-emerald-400">{completedCount}</strong> de {dreams.length}
          </div>

          <Button
            onClick={() => setIsAddOpen(true)}
            variant="glow"
            size="sm"
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" /> Añadir Sueño
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {[
          { id: "all", label: "Todos los sueños" },
          { id: "in_progress", label: "En progreso" },
          { id: "pending", label: "Por iniciar" },
          { id: "completed", label: "Cumplidos ✨" },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer",
              filter === item.id
                ? "bg-zinc-800 text-white font-semibold border border-zinc-700 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Dreams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDreams.length === 0 ? (
          <div className="col-span-full py-12 text-center border border-dashed border-zinc-800 rounded-2xl p-6">
            <Sparkles className="h-8 w-8 text-amber-500/60 mx-auto mb-2" />
            <p className="text-sm font-semibold text-zinc-200">
              No tienes sueños registrados en esta sección.
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Tu lista de sueños te recuerda por qué vale la pena esforzarse cada día.
            </p>
            <Button
              onClick={() => setIsAddOpen(true)}
              variant="glow"
              size="sm"
              className="mt-3"
            >
              + Registrar mi primer sueño
            </Button>
          </div>
        ) : (
          filteredDreams.map((dream) => {
          const isDone = dream.status === "completed";
          const isInProgress = dream.status === "in_progress";

          return (
            <Card
              key={dream.id}
              className={cn(
                "flex flex-col justify-between border transition-all duration-200",
                isDone
                  ? "bg-emerald-950/15 border-emerald-500/30 shadow-sm"
                  : isInProgress
                  ? "bg-zinc-900/60 border-amber-500/20 hover:border-amber-500/40"
                  : "bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700/60"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline" className="text-[10px] py-0 px-2">
                    {dream.category}
                  </Badge>

                  {dream.targetYear && (
                    <span className="text-[11px] font-mono text-zinc-400">
                      Meta {dream.targetYear}
                    </span>
                  )}
                </div>

                <CardTitle
                  className={cn(
                    "text-sm sm:text-base font-semibold mt-2 leading-snug",
                    isDone ? "line-through text-zinc-300" : "text-zinc-100"
                  )}
                >
                  {dream.title}
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  {dream.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                  <span
                    className={cn(
                      "text-[11px] font-medium flex items-center gap-1.5",
                      isDone
                        ? "text-emerald-400"
                        : isInProgress
                        ? "text-amber-400"
                        : "text-zinc-400"
                    )}
                  >
                    {isDone ? (
                      <>
                        <CheckCircle className="h-3.5 w-3.5" /> Cumplido
                      </>
                    ) : isInProgress ? (
                      <>
                        <Clock className="h-3.5 w-3.5" /> En camino
                      </>
                    ) : (
                      <>
                        <CircleAlert className="h-3.5 w-3.5" /> Pendiente
                      </>
                    )}
                  </span>

                  {/* Status Toggle buttons */}
                  <div className="flex items-center gap-1">
                    {!isDone && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(dream.id, "completed")}
                        className="px-2 py-1 text-[10px] rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors font-medium cursor-pointer"
                      >
                        ✓ Cumplir
                      </button>
                    )}

                    {isDone && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(dream.id, "in_progress")}
                        className="px-2 py-1 text-[10px] rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors cursor-pointer"
                      >
                        Reabrir
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }))}
      </div>

      {/* Dialog para nuevo sueño */}
      <Dialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        title="Añadir a la Lista de Sueños"
        description="Escribe un objetivo trascendente que quieras experimentar en esta vida."
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
              ¿Cuál es tu sueño?
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Cruzar el océano en velero, construir mi casa en el bosque..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
              Descripción o Visión
            </label>
            <textarea
              rows={2}
              placeholder="Cómo te sentirás, qué se requiere para lograrlo..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                Categoría
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Dream["category"])}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              >
                <option value="Experiencias">Experiencias</option>
                <option value="Viajes">Viajes</option>
                <option value="Finanzas">Finanzas</option>
                <option value="Creatividad">Creatividad</option>
                <option value="Impacto">Impacto</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                Año Estimado
              </label>
              <input
                type="number"
                min={2026}
                max={2060}
                value={targetYear}
                onChange={(e) => setTargetYear(Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="glow">
              Guardar Sueño
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
