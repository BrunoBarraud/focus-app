"use client";

import * as React from "react";
import { CheckCircle2, Circle, Plus, X } from "lucide-react";
import type { Goal } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isTempId } from "./useGoals";

interface MilestoneEditorProps {
  goal: Goal;
  onToggle: (goalId: string, milestoneId: string) => void;
  onAdd: (goalId: string, title: string) => Promise<boolean>;
  onDelete: (goalId: string, milestoneId: string) => void;
}

/** Hitos de una meta: tildar, agregar (Enter) y borrar. */
export function MilestoneEditor({ goal, onToggle, onAdd, onDelete }: MilestoneEditorProps) {
  const [draft, setDraft] = React.useState("");
  const disabled = isTempId(goal.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    const added = await onAdd(goal.id, title);
    if (!added) setDraft(title);
  };

  return (
    <div className="space-y-1">
      {goal.milestones.length === 0 && (
        <p className="text-xs text-zinc-400 px-1.5 pb-1">
          Dividí la meta en pasos concretos. El progreso se calcula con los que vayas cumpliendo.
        </p>
      )}

      {goal.milestones.map((m) => (
        <div key={m.id} className="group/milestone flex items-center gap-1 rounded-lg hover:bg-white/[0.04]">
          <button
            type="button"
            onClick={() => onToggle(goal.id, m.id)}
            disabled={isTempId(m.id)}
            className="flex-1 min-w-0 text-left flex items-center gap-2 p-1.5 cursor-pointer disabled:cursor-wait"
          >
            {m.completed ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-zinc-500 shrink-0" />
            )}
            <span className={cn("text-sm truncate", m.completed ? "line-through text-zinc-500" : "text-zinc-300")}>
              {m.title}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onDelete(goal.id, m.id)}
            disabled={isTempId(m.id)}
            aria-label={`Eliminar el hito ${m.title}`}
            className="p-1.5 text-zinc-500 hover:text-rose-400 opacity-0 group-hover/milestone:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-1.5 pt-1">
        <Plus className="h-4 w-4 text-zinc-500 shrink-0" />
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={disabled}
          maxLength={200}
          aria-label={`Agregar un hito a ${goal.title}`}
          placeholder="Agregar un hito y presionar Enter"
          className="flex-1 min-w-0 bg-transparent py-1 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none border-b border-transparent focus:border-violet-500/60"
        />
      </form>
    </div>
  );
}
