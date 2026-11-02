"use client";

import * as React from "react";
import { todayIso } from "./dates";

// Bloques de foco terminados HOY en este dispositivo. Antes el contador vivía
// solo en memoria y volvía a 0 al recargar o al cambiar de página.
// Se guarda en localStorage (comodidad por dispositivo, no es un dato crítico);
// si el almacenamiento no está disponible, simplemente cuenta desde 0.

const KEY = "focus:daily-focus";

interface DailyFocus {
  blocks: number;
  minutes: number;
}

const EMPTY: DailyFocus = { blocks: 0, minutes: 0 };
const listeners = new Set<() => void>();
let cache: { raw: string | null; date: string; value: DailyFocus } | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): DailyFocus {
  const raw = readRaw();
  const today = todayIso();
  // useSyncExternalStore exige devolver el mismo objeto si nada cambió.
  if (cache && cache.raw === raw && cache.date === today) return cache.value;

  let value = EMPTY;
  try {
    const parsed = raw ? (JSON.parse(raw) as Partial<DailyFocus> & { date?: string }) : null;
    if (parsed?.date === today) {
      value = { blocks: Number(parsed.blocks) || 0, minutes: Number(parsed.minutes) || 0 };
    }
  } catch {
    // Dato corrupto: se ignora.
  }
  cache = { raw, date: today, value };
  return value;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

const getServerSnapshot = () => EMPTY;

export function useDailyFocus() {
  const value = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addBlock = React.useCallback((minutes: number) => {
    const current = getSnapshot();
    const next = { date: todayIso(), blocks: current.blocks + 1, minutes: current.minutes + Math.round(minutes) };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Sin almacenamiento disponible: el contador no se persiste.
    }
    listeners.forEach((l) => l());
  }, []);

  return { ...value, addBlock };
}
