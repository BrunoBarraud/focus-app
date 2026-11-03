import type { CalendarSchedule, PlannerEvent, WeekDay } from "./types";

// Lógica pura de la grilla de horario semanal (bloques tipo facultad).

export const DEFAULT_SCHEDULE: CalendarSchedule = {
  start: "07:30",
  slotMinutes: 55,
  gapMinutes: 5,
  end: "21:25",
};

/** Máximo de bloques por día (evita grillas absurdas con bloques de 10 min). */
export const MAX_SLOTS = 40;

export interface TimeSlot {
  index: number;
  start: string; // HH:MM
  end: string; // HH:MM
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Bloques del día: 07:30–08:25, 08:30–09:25, … mientras el bloque termine antes del fin del día. */
export function buildSlots(schedule: CalendarSchedule): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const end = toMinutes(schedule.end);
  let cursor = toMinutes(schedule.start);
  while (cursor + schedule.slotMinutes <= end && slots.length < MAX_SLOTS && cursor + schedule.slotMinutes <= 24 * 60) {
    slots.push({ index: slots.length, start: fromMinutes(cursor), end: fromMinutes(cursor + schedule.slotMinutes) });
    cursor += schedule.slotMinutes + schedule.gapMinutes;
  }
  return slots;
}

/**
 * Rango de bloques [first, last] que ocupa un evento. Un evento que no coincide
 * exacto con los bloques se ajusta a los que toca. null si queda fuera del día.
 */
export function slotRange(slots: TimeSlot[], startTime: string, endTime?: string): [number, number] | null {
  if (slots.length === 0) return null;
  const start = toMinutes(startTime);
  // Sin hora de fin: ocupa un solo bloque.
  const end = endTime ? toMinutes(endTime) : start + 1;
  if (end <= start) return null;

  let first = -1;
  let last = -1;
  for (const slot of slots) {
    const s = toMinutes(slot.start);
    const e = toMinutes(slot.end);
    if (s < end && e > start) {
      if (first === -1) first = slot.index;
      last = slot.index;
    }
  }
  return first === -1 ? null : [first, last];
}

export interface TimetableBlock {
  event: PlannerEvent;
  first: number;
  last: number;
  /** Columna dentro del día cuando hay clases superpuestas (Com A / Com B). */
  lane: number;
  lanes: number;
}

/** Bloques de un día, repartidos en carriles si se superponen. */
export function layoutDay(events: PlannerEvent[], slots: TimeSlot[], day: WeekDay): TimetableBlock[] {
  const placed = events
    .filter((e) => e.recurring && e.startTime && e.daysOfWeek.includes(day))
    .map((event) => ({ event, range: slotRange(slots, event.startTime!, event.endTime) }))
    .filter((x): x is { event: PlannerEvent; range: [number, number] } => x.range !== null)
    .sort((a, b) => a.range[0] - b.range[0] || b.range[1] - a.range[1] || a.event.title.localeCompare(b.event.title));

  // Agrupa en "clusters" de bloques que se pisan y asigna carriles dentro de cada uno.
  const blocks: TimetableBlock[] = [];
  let cluster: TimetableBlock[] = [];
  let clusterEnd = -1;
  const laneEnds: number[] = [];

  const flush = () => {
    const lanes = Math.max(1, laneEnds.length);
    cluster.forEach((b) => (b.lanes = lanes));
    blocks.push(...cluster);
    cluster = [];
    laneEnds.length = 0;
  };

  for (const { event, range } of placed) {
    const [first, last] = range;
    if (cluster.length && first > clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end < first);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(last);
    } else {
      laneEnds[lane] = last;
    }
    cluster.push({ event, first, last, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, last);
  }
  if (cluster.length) flush();
  return blocks;
}

// ------------------------------------------------------------------------------
// Colores de las clases
// ------------------------------------------------------------------------------

export const TIMETABLE_COLORS = {
  teal: { label: "Verde agua", block: "bg-teal-600 border-teal-400/50 text-white", dot: "bg-teal-500" },
  emerald: { label: "Verde oscuro", block: "bg-emerald-800 border-emerald-500/50 text-white", dot: "bg-emerald-700" },
  violet: { label: "Violeta", block: "bg-violet-600 border-violet-400/50 text-white", dot: "bg-violet-500" },
  blue: { label: "Azul", block: "bg-blue-600 border-blue-400/50 text-white", dot: "bg-blue-500" },
  sky: { label: "Celeste", block: "bg-sky-600 border-sky-400/50 text-white", dot: "bg-sky-500" },
  amber: { label: "Ámbar", block: "bg-amber-500 border-amber-300/60 text-zinc-950", dot: "bg-amber-500" },
  rose: { label: "Rosa", block: "bg-rose-600 border-rose-400/50 text-white", dot: "bg-rose-500" },
  slate: { label: "Gris", block: "bg-zinc-700 border-zinc-500/50 text-white", dot: "bg-zinc-500" },
} as const;

export type TimetableColor = keyof typeof TIMETABLE_COLORS;
export const TIMETABLE_COLOR_KEYS = Object.keys(TIMETABLE_COLORS) as TimetableColor[];

export function isTimetableColor(value: unknown): value is TimetableColor {
  return typeof value === "string" && value in TIMETABLE_COLORS;
}

/**
 * Color de una clase: el elegido, o uno estable según el nombre de la materia
 * (todas las clases de "Redes II" salen del mismo color sin configurar nada).
 */
export function colorFor(event: Pick<PlannerEvent, "title" | "color">): TimetableColor {
  if (isTimetableColor(event.color)) return event.color;
  const key = event.title.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return TIMETABLE_COLOR_KEYS[hash % TIMETABLE_COLOR_KEYS.length];
}
