import type { CalendarSchedule } from "./types";

// Lógica pura de la grilla horaria (vistas Día/Semana e impresión):
// filas por hora o por bloques tipo facultad, y carriles para lo superpuesto.

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
  const clamped = Math.max(0, Math.min(total, 24 * 60 - 1));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
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

/** Filas de una hora entre `fromHour` y `toHour` (para la grilla común). */
export function buildHourSlots(fromHour: number, toHour: number): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let h = fromHour; h < toHour; h++) {
    slots.push({ index: slots.length, start: fromMinutes(h * 60), end: fromMinutes((h + 1) * 60) });
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
  const end = endTime && toMinutes(endTime) > start ? toMinutes(endTime) : start + 1;

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

/**
 * Posición vertical (en "filas", con decimales) de una hora dentro de la grilla.
 * Entre bloques (en el corte) se pega al bloque siguiente. null si cae afuera.
 */
export function rowOffset(slots: TimeSlot[], minutes: number): number | null {
  if (slots.length === 0) return null;
  if (minutes < toMinutes(slots[0].start)) return null;
  for (const slot of slots) {
    const s = toMinutes(slot.start);
    const e = toMinutes(slot.end);
    if (minutes < s) return slot.index;
    if (minutes <= e) return slot.index + (minutes - s) / (e - s);
  }
  return null;
}

export interface LaneInput {
  id: string;
  start: number;
  end: number;
}

export interface LaneResult {
  lane: number;
  lanes: number;
}

/**
 * Reparte intervalos en carriles: lo que se superpone queda lado a lado
 * (Com A / Com B a la misma hora). `start`/`end` en cualquier unidad.
 */
export function assignLanes(items: LaneInput[]): Map<string, LaneResult> {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const result = new Map<string, LaneResult>();
  let cluster: string[] = [];
  let clusterEnd = -Infinity;
  const laneEnds: number[] = [];

  const flush = () => {
    const lanes = Math.max(1, laneEnds.length);
    for (const id of cluster) result.set(id, { lane: result.get(id)!.lane, lanes });
    cluster = [];
    laneEnds.length = 0;
  };

  for (const item of sorted) {
    if (cluster.length && item.start >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= item.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.end);
    } else {
      laneEnds[lane] = item.end;
    }
    result.set(item.id, { lane, lanes: 1 });
    cluster.push(item.id);
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  if (cluster.length) flush();
  return result;
}
