import { describe, expect, it } from "vitest";
import { effectiveReminders, planEventReminders } from "../notifications/plan-reminders";
import { completionKey } from "../recurrence";
import type { PlannerEvent } from "../types";

const TZ = "America/Argentina/Buenos_Aires"; // UTC-3

function event(overrides: Partial<PlannerEvent>): PlannerEvent {
  return {
    id: "e",
    calendarId: "c",
    title: "Final de Redes II",
    kind: "event",
    allDay: false,
    startDate: "2026-12-14",
    startTime: "09:00",
    endTime: "12:00",
    priority: "medium",
    tag: "General",
    ...overrides,
  };
}

describe("recordatorios efectivos", () => {
  it("con hora usa los del calendario si el evento no define", () => {
    expect(effectiveReminders(event({}), { defaultReminders: [15] })).toEqual([15]);
    expect(effectiveReminders(event({ reminders: [1440] }), { defaultReminders: [15] })).toEqual([1440]);
  });

  it("sin hora solo avisa si el evento lo pidió", () => {
    const allDay = event({ allDay: true, startTime: undefined });
    expect(effectiveReminders(allDay, { defaultReminders: [15] })).toEqual([]);
    expect(effectiveReminders({ ...allDay, reminders: [1440] }, { defaultReminders: [15] })).toEqual([1440]);
  });
});

describe("planificación de recordatorios", () => {
  it("avisa 1 semana antes de un final", () => {
    // Final: 14/12 09:00 local = 12:00 UTC. Una semana antes: 7/12 12:00 UTC.
    const out = planEventReminders({
      event: event({}),
      offsets: [10080],
      timeZone: TZ,
      now: new Date("2026-12-07T11:58:00Z"),
      completed: new Set(),
    });
    expect(out).toHaveLength(1);
    expect(out[0].scheduled_for).toBe("2026-12-07T12:00:00.000Z");
    expect(out[0].body).toContain("lunes 14 de diciembre");
  });

  it("15 minutos antes de una clase semanal", () => {
    const clase = event({ startDate: "2026-11-03", startTime: "13:30", recurrence: { freq: "weekly", interval: 1 } });
    // Martes 17/11 13:15 local = 16:15 UTC.
    const out = planEventReminders({
      event: clase,
      offsets: [15],
      timeZone: TZ,
      now: new Date("2026-11-17T16:00:00Z"),
      completed: new Set(),
    });
    expect(out.map((r) => r.scheduled_for)).toEqual(["2026-11-17T16:15:00.000Z"]);
    expect(out[0].body).toBe("Empieza en 15 minutos (13:30).");
  });

  it("no avisa fuera de la ventana ni tareas ya hechas", () => {
    const tarea = event({ kind: "task", startDate: "2026-11-17", startTime: "13:30" });
    const now = new Date("2026-11-17T16:00:00Z");
    expect(planEventReminders({ event: tarea, offsets: [120], timeZone: TZ, now, completed: new Set() })).toEqual([]);
    expect(
      planEventReminders({
        event: tarea,
        offsets: [15],
        timeZone: TZ,
        now,
        completed: new Set([completionKey("e", "2026-11-17")]),
      })
    ).toEqual([]);
  });

  it("un evento de todo el día avisa a las 9 del día anterior", () => {
    const cumple = event({ allDay: true, startTime: undefined, endTime: undefined, title: "Cumple de mamá" });
    // 13/12 09:00 local = 12:00 UTC.
    const out = planEventReminders({
      event: cumple,
      offsets: [1440],
      timeZone: TZ,
      now: new Date("2026-12-13T11:50:00Z"),
      completed: new Set(),
    });
    expect(out).toHaveLength(1);
    expect(out[0].body).toBe("Es mañana.");
  });
});
