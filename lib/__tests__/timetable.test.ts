import { describe, expect, it } from "vitest";
import { assignLanes, buildHourSlots, buildSlots, DEFAULT_SCHEDULE, rowOffset, slotRange } from "../timetable";

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
    expect(slotRange(slots, "18:30")).toEqual([11, 11]);
    expect(slotRange(slots, "06:00", "07:00")).toBe(null);
  });

  it("filas por hora y posición dentro de la fila", () => {
    const hours = buildHourSlots(8, 10);
    expect(hours.map((s) => s.start)).toEqual(["08:00", "09:00"]);
    expect(rowOffset(hours, 8 * 60 + 30)).toBe(0.5);
    expect(rowOffset(hours, 7 * 60)).toBe(null);
  });
});

describe("carriles", () => {
  it("lo que se superpone va lado a lado; lo que no, a lo ancho", () => {
    const lanes = assignLanes([
      { id: "a", start: 11, end: 14 },
      { id: "b", start: 11, end: 14 },
      { id: "c", start: 9, end: 11 },
    ]);
    expect(lanes.get("c")).toEqual({ lane: 0, lanes: 1 });
    expect(lanes.get("a")!.lanes).toBe(2);
    expect([lanes.get("a")!.lane, lanes.get("b")!.lane].sort()).toEqual([0, 1]);
  });
});
