"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  side?: "left" | "right";
  className?: string;
}

export function Sheet({
  open,
  onOpenChange,
  children,
  side = "left",
  className,
}: SheetProps) {
  // Bloquear scroll cuando el sheet está abierto
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ease-in-out"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Sheet Content Panel */}
      <div
        className={cn(
          "relative z-50 flex h-full w-4/5 max-w-xs flex-col bg-zinc-950/95 p-6 shadow-2xl border-zinc-800 backdrop-blur-xl transition-transform duration-300 ease-out",
          side === "left"
            ? "border-r animate-in slide-in-from-left"
            : "ml-auto border-l animate-in slide-in-from-right",
          className
        )}
      >
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
          aria-label="Cerrar menú"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}
