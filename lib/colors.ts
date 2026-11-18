// Paleta compartida por calendarios y eventos. Se guarda la clave ("violet")
// en la base; las clases de Tailwind están escritas completas para que el
// compilador de Tailwind las incluya.

export const PALETTE = {
  violet: {
    label: "Violeta",
    dot: "bg-violet-500",
    block: "bg-violet-600 border-violet-400/50 text-white",
    soft: "bg-violet-500/15 border-violet-500/30 text-violet-200",
    hex: "#7c3aed",
  },
  indigo: {
    label: "Índigo",
    dot: "bg-indigo-500",
    block: "bg-indigo-600 border-indigo-400/50 text-white",
    soft: "bg-indigo-500/15 border-indigo-500/30 text-indigo-200",
    hex: "#4f46e5",
  },
  blue: {
    label: "Azul",
    dot: "bg-blue-500",
    block: "bg-blue-600 border-blue-400/50 text-white",
    soft: "bg-blue-500/15 border-blue-500/30 text-blue-200",
    hex: "#2563eb",
  },
  sky: {
    label: "Celeste",
    dot: "bg-sky-500",
    block: "bg-sky-600 border-sky-400/50 text-white",
    soft: "bg-sky-500/15 border-sky-500/30 text-sky-200",
    hex: "#0284c7",
  },
  teal: {
    label: "Verde agua",
    dot: "bg-teal-500",
    block: "bg-teal-600 border-teal-400/50 text-white",
    soft: "bg-teal-500/15 border-teal-500/30 text-teal-200",
    hex: "#0d9488",
  },
  emerald: {
    label: "Verde",
    dot: "bg-emerald-600",
    block: "bg-emerald-700 border-emerald-500/50 text-white",
    soft: "bg-emerald-500/15 border-emerald-500/30 text-emerald-200",
    hex: "#047857",
  },
  lime: {
    label: "Lima",
    dot: "bg-lime-500",
    block: "bg-lime-500 border-lime-300/60 text-zinc-950",
    soft: "bg-lime-500/15 border-lime-500/30 text-lime-200",
    hex: "#84cc16",
  },
  amber: {
    label: "Ámbar",
    dot: "bg-amber-500",
    block: "bg-amber-500 border-amber-300/60 text-zinc-950",
    soft: "bg-amber-500/15 border-amber-500/30 text-amber-200",
    hex: "#f59e0b",
  },
  orange: {
    label: "Naranja",
    dot: "bg-orange-500",
    block: "bg-orange-600 border-orange-400/50 text-white",
    soft: "bg-orange-500/15 border-orange-500/30 text-orange-200",
    hex: "#ea580c",
  },
  rose: {
    label: "Rojo",
    dot: "bg-rose-500",
    block: "bg-rose-600 border-rose-400/50 text-white",
    soft: "bg-rose-500/15 border-rose-500/30 text-rose-200",
    hex: "#e11d48",
  },
  pink: {
    label: "Rosa",
    dot: "bg-pink-500",
    block: "bg-pink-600 border-pink-400/50 text-white",
    soft: "bg-pink-500/15 border-pink-500/30 text-pink-200",
    hex: "#db2777",
  },
  slate: {
    label: "Gris",
    dot: "bg-zinc-500",
    block: "bg-zinc-700 border-zinc-500/50 text-white",
    soft: "bg-zinc-500/15 border-zinc-500/30 text-zinc-200",
    hex: "#52525b",
  },
} as const;

export type ColorKey = keyof typeof PALETTE;
export const COLOR_KEYS = Object.keys(PALETTE) as ColorKey[];

export function isColorKey(value: unknown): value is ColorKey {
  return typeof value === "string" && value in PALETTE;
}

/** Acepta claves y también el formato viejo ("bg-violet-500 text-white"). */
export function normalizeColor(value: unknown, fallback: ColorKey = "violet"): ColorKey {
  if (isColorKey(value)) return value;
  if (typeof value === "string") {
    const legacy = value.match(/bg-([a-z]+)-/)?.[1];
    if (isColorKey(legacy)) return legacy;
  }
  return fallback;
}

/** Colores sugeridos para calendarios nuevos (en orden). */
export const CALENDAR_COLOR_ORDER: ColorKey[] = ["violet", "teal", "blue", "amber", "rose", "emerald", "pink", "sky"];
