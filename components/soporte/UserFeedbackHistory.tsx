"use client";

import * as React from "react";
import { SupportFeedback, SupportFeedbackStatus } from "@/lib/types";
import {
  Lightbulb,
  Sparkles,
  Bug,
  HelpCircle,
  MessageSquare,
  Star,
  Clock,
  CheckCircle2,
  AlertCircle,
  Crown,
  Calendar,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UserFeedbackHistoryProps {
  feedbacks: SupportFeedback[];
}

const STATUS_BADGES: Record<
  SupportFeedbackStatus,
  { label: string; bg: string; text: string; border: string; icon: React.ElementType }
> = {
  pending: {
    label: "Pendiente",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
    icon: Clock,
  },
  in_review: {
    label: "En Revisión",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
    icon: Sparkles,
  },
  resolved: {
    label: "Implementado / Resuelto",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
    icon: CheckCircle2,
  },
  dismissed: {
    label: "Descartado",
    bg: "bg-zinc-800/60",
    text: "text-zinc-400",
    border: "border-zinc-700/40",
    icon: AlertCircle,
  },
};

const TYPE_ICONS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  suggestion: { label: "Sugerencia", icon: Lightbulb, color: "text-amber-400" },
  improvement: { label: "Mejora", icon: Sparkles, color: "text-violet-400" },
  bug: { label: "Bug / Error", icon: Bug, color: "text-rose-400" },
  question: { label: "Consulta", icon: HelpCircle, color: "text-blue-400" },
  other: { label: "Otro", icon: MessageSquare, color: "text-zinc-400" },
};

export function UserFeedbackHistory({ feedbacks }: UserFeedbackHistoryProps) {
  if (feedbacks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 p-8 sm:p-12 text-center">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-3">
          <Layers className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-zinc-200">Aún no has enviado solicitudes</h3>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
          Usa la pestaña "Enviar Feedback" para sugerir nuevas ideas o reportar cualquier inconveniente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {feedbacks.map((item) => {
        const statusConfig = STATUS_BADGES[item.status] || STATUS_BADGES.pending;
        const StatusIcon = statusConfig.icon;
        const typeConfig = TYPE_ICONS[item.type] || TYPE_ICONS.suggestion;
        const TypeIcon = typeConfig.icon;

        const formattedDate = new Date(item.createdAt).toLocaleDateString("es-ES", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <div
            key={item.id}
            className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 backdrop-blur-xl p-4 sm:p-5 shadow-sm hover:border-zinc-700/80 transition-all space-y-3"
          >
            {/* Header de la tarjeta */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-zinc-800/60">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                    statusConfig.bg,
                    statusConfig.text,
                    statusConfig.border
                  )}
                >
                  <StatusIcon className="h-3 w-3" />
                  {statusConfig.label}
                </span>

                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 bg-zinc-950/60 px-2 py-0.5 rounded-md border border-zinc-800">
                  <TypeIcon className={cn("h-3 w-3", typeConfig.color)} />
                  {typeConfig.label}
                </span>

                {item.priority === "high" && (
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    Prioridad Alta
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-zinc-500">
                {item.rating && (
                  <div className="flex items-center text-amber-400">
                    {Array.from({ length: item.rating }).map((_, idx) => (
                      <Star key={idx} className="h-3 w-3 fill-current" />
                    ))}
                  </div>
                )}
                <span className="flex items-center gap-1 text-[11px]">
                  <Calendar className="h-3 w-3" />
                  {formattedDate}
                </span>
              </div>
            </div>

            {/* Contenido */}
            <div>
              <h4 className="text-sm sm:text-base font-bold text-zinc-100 mb-1">{item.title}</h4>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed whitespace-pre-line">
                {item.description}
              </p>
            </div>

            {/* Respuesta del Administrador (si la hay) */}
            {item.adminResponse && (
              <div className="mt-3 p-3.5 rounded-xl bg-violet-950/30 border border-violet-500/30 text-xs sm:text-sm space-y-1 animate-in fade-in">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] uppercase tracking-wider">
                  <Crown className="h-3.5 w-3.5" />
                  Respuesta del Administrador
                </div>
                <p className="text-zinc-200 leading-relaxed whitespace-pre-line">
                  {item.adminResponse}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
