import { describe, expect, it } from "vitest";
import { buildSlots, colorFor, layoutDay, slotRange, DEFAULT_SCHEDULE } from "../timetable";
import type { PlannerEvent } from "../types";

function event(overrides: Partial<PlannerEvent>): PlannerEvent {
  return {
    id: overrides.title ?? "e",
    calendarId: "c",
    title: "Materia",
    recurring: true,
    daysOfWeek: ["M"],
    priority: "medium",
    tag: "Curso",
    ...overrides,
  };
}

describe("bloques horarios", () => {
  it("arma los bloques de 55 min con 5 de corte desde las 07:30", () => {
    const slots = buildSlots(DEFAULT_SCHEDULE);
    expect(slots[0]).toEqual({ index: 0, start: "07:30", end: "08:25" });
    expect(slots[6]).toEqual({ index: 6, start: "13:30", end: "14:25" });
    expect(slots[slots.length - 1].end).toBe("21:25");
    expect(slots).toHaveLength(14);
  });

  it("ubica una clase en los bloques que ocupa", () => {
    const slots = buildSlots(DEFAULT_SCHEDULE);
    expect(slotRange(slots, "13:30", "16:25")).toEqual([6, 8]);
    // Sin hora de fin ocupa un solo bloque.
    expect(slotRange(slots, "18:30")).toEqual([11, 11]);
    // Fuera del día no se muestra.
    expect(slotRange(slots, "06:00", "07:00")).toBe(null);
  });
});

describe("clases superpuestas", () => {
  it("las reparte en carriles (Com A / Com B)", () => {
    const slots = buildSlots(DEFAULT_SCHEDULE);
    const blocks = layoutDay(
      [
        event({ id: "a", title: "Redes II", tag: "Com A", startTime: "18:30", endTime: "21:25" }),
        event({ id: "b", title: "Redes II", tag: "Com B", startTime: "18:30", endTime: "21:25" }),
        event({ id: "c", title: "Física III", startTime: "16:30", endTime: "18:25" }),
      ],
      slots,
      "M"
    );
    const byId = Object.fromEntries(blocks.map((b) => [b.event.id, b]));
    expect(byId.c.lanes).toBe(1);
    expect(byId.a.lanes).toBe(2);
    expect([byId.a.lane, byId.b.lane].sort()).toEqual([0, 1]);
  });

  it("ignora tareas puntuales y de otros días", () => {
    const slots = buildSlots(DEFAULT_SCHEDULE);
    const blocks = layoutDay(
      [
        event({ id: "x", recurring: false, date: "2026-11-03", startTime: "13:30" }),
        event({ id: "y", daysOfWeek: ["L"], startTime: "13:30" }),
      ],
      slots,
      "M"
    );
    expect(blocks).toEqual([]);
  });
});

describe("colores", () => {
  it("usa el elegido o uno estable por materia", () => {
    expect(colorFor({ title: "Redes II", color: "rose" })).toBe("rose");
    expect(colorFor({ title: "Redes II" })).toBe(colorFor({ title: "  redes ii " }));
  });
});
