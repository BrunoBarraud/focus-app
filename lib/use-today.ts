"use client";

import * as React from "react";
import { todayIso } from "./dates";

const CHECK_INTERVAL_MS = 60_000;

function subscribe(onChange: () => void) {
  // Si la app queda abierta pasada la medianoche, "hoy" se actualiza solo.
  const interval = setInterval(onChange, CHECK_INTERVAL_MS);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    clearInterval(interval);
    document.removeEventListener("visibilitychange", onChange);
  };
}

/**
 * Fecha local del usuario ("YYYY-MM-DD"). Devuelve `null` en el render del
 * servidor y durante la hidratación (el servidor corre en UTC y no sabe en qué
 * día está el usuario), y la fecha real apenas monta en el cliente.
 */
export function useToday(): string | null {
  return React.useSyncExternalStore(subscribe, todayIso, () => null);
}
