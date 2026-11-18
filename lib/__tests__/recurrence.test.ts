import { describe, expect, it } from "vitest";
import {
  completionKey,
  describeRecurrence,
  nthWeekdayOf,
  occurrencesInRange,
  occurrencesOn,
  recurrenceStarts,
} from "../recurrence";
import type { PlannerEvent } from "../types";

function event(overrides: Partial<PlannerEvent>): PlannerEvent {
  return {
    id: "e",
    calendarId: "c",
    title: "t",
    kind: "event",
    allDay: false,
    startDate: "2026-11-02",
    priority: "medium",
    tag: "General",
    ...overrides,
  };
}

describe("repeticiones", () => {
  it("sin regla: una sola vez", () => {
    expect(recurrenceStarts("2026-12-14", undefined, "2027-01-01")).toEqual(["2026-12-14"]);
    expect(recurrenceStarts("2026-12-14", undefined, "2026-12-01")).toEqual([]);
  });

  it("diaria y cada N días", () => {
    expect(recurrenceStarts("2026-11-01", { freq: "daily", interval: 1 }, "2026-11-03")).toEqual([
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
    ]);
    expect(recurrenceStarts("2026-11-01", { freq: "daily", interval: 3 }, "2026-11-10")).toEqual([
      "2026-11-01",
      "2026-11-04",
      "2026-11-07",
      "2026-11-10",
    ]);
  });

  it("semanal en varios días, con fecha de fin (fin de cursada)", () => {
    const rule = { freq: "weekly" as const, interval: 1, byWeekday: ["M" as const, "J" as const], until: "2026-11-19" };
    // 3/11 es martes.
    expect(recurrenceStarts("2026-11-03", rule, "2026-12-31")).toEqual([
      "2026-11-03",
      "2026-11-05",
      "2026-11-10",
      "2026-11-12",
      "2026-11-17",
      "2026-11-19",
    ]);
  });

  it("cada 2 semanas", () => {
    expect(recurrenceStarts("2026-11-02", { freq: "weekly", interval: 2 }, "2026-11-30")).toEqual([
      "2026-11-02",
      "2026-11-16",
      "2026-11-30",
    ]);
  });

  it("no genera días anteriores al inicio dentro de la primera semana", () => {
    // Empieza el miércoles 4/11 pero se repite lunes y miércoles.
    expect(recurrenceStarts("2026-11-04", { freq: "weekly", interval: 1, byWeekday: ["L", "X"] }, "2026-11-10")).toEqual([
      "2026-11-04",
      "2026-11-09",
    ]);
  });

  it("cantidad de veces", () => {
    expect(recurrenceStarts("2026-11-02", { freq: "daily", interval: 1, count: 2 }, "2027-01-01")).toEqual([
      "2026-11-02",
      "2026-11-03",
    ]);
  });

  it("mensual el mismo día, salteando los meses que no lo tienen", () => {
    expect(recurrenceStarts("2026-10-31", { freq: "monthly", interval: 1 }, "2027-01-31")).toEqual([
      "2026-10-31",
      "2026-12-31",
      "2027-01-31",
    ]);
  });

  it("mensual el segundo martes y el último viernes", () => {
    // 10/11/2026 es el segundo martes.
    expect(nthWeekdayOf("2026-11-10")).toEqual({ weekday: 1, nth: 2 });
    expect(recurrenceStarts("2026-11-10", { freq: "monthly", interval: 1, monthlyMode: "nth" }, "2027-01-31")).toEqual([
      "2026-11-10",
      "2026-12-08",
      "2027-01-12",
    ]);
    // 27/11/2026 es el último viernes (quinto no hay): se toma como "el último".
    expect(recurrenceStarts("2026-10-30", { freq: "monthly", interval: 1, monthlyMode: "nth" }, "2026-12-31")).toEqual([
      "2026-10-30",
      "2026-11-27",
      "2026-12-25",
    ]);
  });

  it("anual, con el 29 de febrero solo en bisiestos", () => {
    expect(recurrenceStarts("2026-07-15", { freq: "yearly", interval: 1 }, "2028-12-31")).toEqual([
      "2026-07-15",
      "2027-07-15",
      "2028-07-15",
    ]);
    expect(recurrenceStarts("2028-02-29", { freq: "yearly", interval: 1 }, "2033-01-01")).toEqual(["2028-02-29", "2032-02-29"]);
  });
});

describe("ocurrencias en un rango", () => {
  it("un final en diciembre aparece en diciembre", () => {
    const final = event({ id: "final", startDate: "2026-12-14", startTime: "09:00", endTime: "12:00" });
    expect(occurrencesInRange([final], new Set(), "2026-12-01", "2026-12-31").map((o) => o.occurrenceDate)).toEqual([
      "2026-12-14",
    ]);
    expect(occurrencesInRange([final], new Set(), "2026-11-01", "2026-11-30")).toEqual([]);
  });

  it("un evento de varios días aparece en todos sus días", () => {
    const finales = event({ id: "semana", allDay: true, startDate: "2026-12-09", endDate: "2026-12-11" });
    expect(occurrencesOn([finales], new Set(), "2026-12-10")).toHaveLength(1);
    expect(occurrencesOn([finales], new Set(), "2026-12-11")[0].occurrenceEndDate).toBe("2026-12-11");
    expect(occurrencesOn([finales], new Set(), "2026-12-12")).toHaveLength(0);
  });

  it("completar una ocurrencia no completa las demás", () => {
    const weekly = event({ id: "w", kind: "task", recurrence: { freq: "weekly", interval: 1 } });
    const done = new Set([completionKey("w", "2026-11-02")]);
    const occ = occurrencesInRange([weekly], done, "2026-11-02", "2026-11-09");
    expect(occ.map((o) => o.completed)).toEqual([true, false]);
  });

  it("ordena: todo el día primero y después por hora", () => {
    const a = event({ id: "tarde", startTime: "18:00" });
    const b = event({ id: "temprano", startTime: "08:00" });
    const c = event({ id: "todo-el-dia", allDay: true });
    expect(occurrencesOn([a, b, c], new Set(), "2026-11-02").map((o) => o.id)).toEqual(["todo-el-dia", "temprano", "tarde"]);
  });
});

describe("textos", () => {
  it("describe la repetición en castellano", () => {
    expect(describeRecurrence(undefined, "2026-11-03")).toBe("No se repite");
    expect(
      describeRecurrence({ freq: "weekly", interval: 1, byWeekday: ["J", "M"], until: "2026-11-28" }, "2026-11-03")
    ).toBe("Cada semana los martes y jueves, hasta el 28 de noviembre");
    expect(describeRecurrence({ freq: "weekly", interval: 2, byWeekday: ["L", "M", "X", "J", "V"] }, "2026-11-03")).toBe(
      "Cada 2 semanas de lunes a viernes"
    );
    expect(describeRecurrence({ freq: "monthly", interval: 1, monthlyMode: "nth" }, "2026-11-10")).toBe(
      "Todos los meses el segundo martes"
    );
    expect(describeRecurrence({ freq: "yearly", interval: 1, count: 3 }, "2026-07-15")).toBe(
      "Todos los años el 15 de julio, 3 veces"
    );
  });
});
