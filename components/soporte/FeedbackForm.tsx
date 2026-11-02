"use client";

import * as React from "react";
import { createFeedbackAction } from "@/app/actions/feedback";
import { SupportFeedback, SupportFeedbackType, SupportFeedbackPriority } from "@/lib/types";
import {
  Lightbulb,
  Sparkles,
  Bug,
  HelpCircle,
  MessageSquare,
  Star,
  Send,
  CheckCircle2,
  AlertCircle,
  Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedbackFormProps {
  onSuccess?: (newFeedback: SupportFeedback) => void;
}

const CATEGORIES: {
  type: SupportFeedbackType;
  label: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  border: string;
}[] = [
  {
    type: "suggestion",
    label: "Sugerencia",
    desc: "Una función nueva",
    icon: Lightbulb,
    color: "text-amber-400 bg-amber-500/10",
    border: "border-amber-500/30",
  },
  {
    type: "improvement",
    label: "Mejora",
    desc: "Algo que ya existe y podría ser mejor",
    icon: Sparkles,
    color: "text-violet-400 bg-violet-500/10",
    border: "border-violet-500/30",
  },
  {
    type: "bug",
    label: "Error",
    desc: "Algo no funciona como debería",
    icon: Bug,
    color: "text-rose-400 bg-rose-500/10",
    border: "border-rose-500/30",
  },
  {
    type: "question",
    label: "Consulta",
    desc: "Una duda sobre cómo usar la app",
    icon: HelpCircle,
    color: "text-blue-400 bg-blue-500/10",
    border: "border-blue-500/30",
  },
];

export function FeedbackForm({ onSuccess }: FeedbackFormProps) {
  const [selectedType, setSelectedType] = React.useState<SupportFeedbackType>("suggestion");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [rating, setRating] = React.useState<number>(5);
  const [hoverRating, setHoverRating] = React.useState<number | null>(null);
  const [priority, setPriority] = React.useState<SupportFeedbackPriority>("medium");
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMsg("Por favor completa el título y la descripción.");
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    const res = await createFeedbackAction({
      type: selectedType,
      title: title.trim(),
      description: description.trim(),
      rating,
      priority,
    });
    setLoading(false);

    if (!res.ok) {
      setErrorMsg(res.error);
      return;
    }
    setSuccess(true);
    setTitle("");
    setDescription("");
    onSuccess?.(res.data);
  };

  // El aviso de éxito se oculta solo; el timer se limpia si el form se desmonta.
  React.useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(false), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 backdrop-blur-xl p-5 sm:p-7 shadow-xl">
      <div className="mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-violet-400" />
          Mandanos tu mensaje
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Contanos qué mejorarías, qué te gustaría que tenga Focus o qué problema encontraste.
        </p>
      </div>

      {success && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          <div>
            <p className="font-semibold">¡Gracias por escribirnos!</p>
            <p className="text-emerald-400/80 text-xs">
              Recibimos tu mensaje. Te vamos a responder en “Mis mensajes”.
            </p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1. Selector de Categoría */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2.5">
            1. Tipo de mensaje
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedType === cat.type;

              return (
                <button
                  key={cat.type}
                  type="button"
                  onClick={() => setSelectedType(cat.type)}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between",
                    isSelected
                      ? "bg-violet-600/15 border-violet-500 text-white shadow-md shadow-violet-950/40 ring-1 ring-violet-500/40"
                      : "bg-zinc-950/40 border-zinc-800/80 text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
                  )}
                >
                  <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center mb-2", cat.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-zinc-200">{cat.label}</span>
                    <span className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">{cat.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Título */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
            2. Título
          </label>
          <input
            type="text"
            required
            placeholder="Ej: Poder editar una tarea"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none transition-colors"
          />
        </div>

        {/* 3. Descripción detallada */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
            3. Detalle
          </label>
          <textarea
            required
            rows={4}
            placeholder="Contanos con el mayor detalle posible. Si es un error, qué estabas haciendo cuando pasó."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none transition-colors resize-none leading-relaxed"
          />
        </div>

        {/* 4. Calificación de experiencia & Prioridad */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-800/60">
          {/* Calificación */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              ¿Qué puntaje le das a la app?
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = (hoverRating !== null ? hoverRating : rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={() => setRating(star)}
                    className="p-1 text-zinc-600 hover:scale-110 transition-transform cursor-pointer"
                    title={`${star} de 5 estrellas`}
                  >
                    <Star
                      className={cn(
                        "h-6 w-6 transition-colors",
                        filled ? "fill-amber-400 text-amber-400" : "text-zinc-700"
                      )}
                    />
                  </button>
                );
              })}
              <span className="text-xs text-zinc-400 ml-2 font-medium">
                {rating === 5
                  ? "⭐⭐⭐⭐⭐ ¡Excelente!"
                  : rating === 4
                  ? "Muy buena"
                  : rating === 3
                  ? "Buena"
                  : rating === 2
                  ? "Regular"
                  : "Por mejorar"}
              </span>
            </div>
          </div>

          {/* Nivel de Prioridad sugerida */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <Flag className="h-3 w-3 text-violet-400" /> Nivel de Prioridad
            </label>
            <div className="flex items-center gap-2">
              {(["low", "medium", "high"] as SupportFeedbackPriority[]).map((p) => {
                const isSelected = priority === p;
                const labels = { low: "Baja", medium: "Media", high: "Alta / Urgente" };
                const colors = {
                  low: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
                  medium: "text-amber-400 border-amber-500/30 bg-amber-500/10",
                  high: "text-rose-400 border-rose-500/30 bg-rose-500/10",
                };

                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      "flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer text-center",
                      isSelected
                        ? cn(colors[p], "shadow-sm font-bold ring-1 ring-white/10")
                        : "bg-zinc-950/40 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    {labels[p]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-3 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-lg shadow-violet-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            <span>{loading ? "Enviando mensaje..." : "Enviar Feedback"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
