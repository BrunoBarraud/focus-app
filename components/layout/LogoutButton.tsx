"use client";

import * as React from "react";
import { Loader2, LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { unsubscribeFromPush } from "@/lib/push-client";
import { cn } from "@/lib/utils";

const PUSH_CLEANUP_TIMEOUT_MS = 3000;

/**
 * Antes de cerrar sesión se quita la suscripción push de este dispositivo:
 * si no, en un equipo compartido los recordatorios del usuario anterior
 * seguirían llegando a quien entre después.
 */
export function LogoutButton({ className }: { className?: string }) {
  const [pending, startTransition] = React.useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await Promise.race([
        unsubscribeFromPush().catch((err) => console.warn("No se pudo limpiar la suscripción push:", err)),
        new Promise((resolve) => setTimeout(resolve, PUSH_CLEANUP_TIMEOUT_MS)),
      ]);
      await logoutAction();
    });
  };

  return (
    <button type="button" onClick={handleLogout} disabled={pending} className={cn("cursor-pointer disabled:opacity-60", className)}>
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
      Cerrar Sesión
    </button>
  );
}
