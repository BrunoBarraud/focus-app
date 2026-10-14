import { describe, expect, it } from "vitest";
import { bestStreak, currentStreak, dateForDay, toMonthView } from "../habits";
import { completionKey, occurrencesOn } from "../planner";
import { safeRedirectPath } from "../redirect";
import type { Habit, PlannerEvent } from "../types";

describe("rachas de hábitos", () => {
  const done = new Set(["2026-10-11", "2026-10-12", "2026-10-13"]);

  it("cuenta hasta ayer si hoy todavía no se marcó", () => {
    expect(currentStreak(done, "2026-10-14")).toBe(3);
  });

  it("incluye hoy si ya se marcó", () => {
    expect(currentStreak(new Set([...done, "2026-10-14"]), "2026-10-14")).toBe(4);
  });

  it("se corta con un día salteado", () => {
    expect(currentStreak(done, "2026-10-15")).toBe(0);
  });

  it("la racha cruza el cambio de mes", () => {
    expect(currentStreak(new Set(["2026-09-30", "2026-10-01"]), "2026-10-01")).toBe(2);
  });

  it("calcula la mejor racha real", () => {
    expect(bestStreak(["2026-10-01", "2026-10-02", "2026-10-05", "2026-10-06", "2026-10-07"])).toBe(3);
    expect(bestStreak([])).toBe(0);
  });

  it("proyecta solo el mes actual", () => {
    const habit: Habit = {
      id: "h1",
      name: "Leer",
      category: "mente",
      monthlyTargetDays: 20,
      color: "#000000",
      completedDates: ["2026-09-30", "2026-10-01", "2026-10-02"],
    };
    const view = toMonthView(habit, "2026-10-02");
    expect(view.completedDays).toEqual({ 1: true, 2: true });
    expect(view.streak).toBe(3);
    expect(dateForDay("2026-10-14", 5)).toBe("2026-10-05");
  });
});

describe("ocurrencias del planificador", () => {
  const base: Omit<PlannerEvent, "id" | "recurring" | "date" | "daysOfWeek"> = {
    calendarId: "c1",
    title: "t",
    priority: "medium",
    tag: "General",
  };
  const weekly: PlannerEvent = { ...base, id: "w", recurring: true, daysOfWeek: ["L", "X"] };
  const oneOff: PlannerEvent = { ...base, id: "o", recurring: false, date: "2026-10-14", daysOfWeek: ["X"] };

  it("una tarea semanal aparece todos los días elegidos", () => {
    expect(occurrencesOn([weekly], new Set(), "2026-10-12").map((o) => o.id)).toEqual(["w"]);
    expect(occurrencesOn([weekly], new Set(), "2026-10-19").map((o) => o.id)).toEqual(["w"]);
    expect(occurrencesOn([weekly], new Set(), "2026-10-13")).toEqual([]);
  });

  it("una tarea puntual aparece solo en su fecha", () => {
    expect(occurrencesOn([oneOff], new Set(), "2026-10-14")).toHaveLength(1);
    expect(occurrencesOn([oneOff], new Set(), "2026-10-21")).toHaveLength(0);
  });

  it("completar una semana no completa la siguiente", () => {
    const completions = new Set([completionKey("w", "2026-10-12")]);
    expect(occurrencesOn([weekly], completions, "2026-10-12")[0].completed).toBe(true);
    expect(occurrencesOn([weekly], completions, "2026-10-19")[0].completed).toBe(false);
  });

  it("ordena por hora de inicio", () => {
    const late = { ...oneOff, id: "late", startTime: "18:00" };
    const early = { ...oneOff, id: "early", startTime: "08:00" };
    const untimed = { ...oneOff, id: "untimed" };
    expect(occurrencesOn([untimed, late, early], new Set(), "2026-10-14").map((o) => o.id)).toEqual([
      "early",
      "late",
      "untimed",
    ]);
  });
});

describe("redirect del login", () => {
  it("acepta rutas internas", () => {
    expect(safeRedirectPath("/habitos")).toBe("/habitos");
    expect(safeRedirectPath("/planificador?x=1")).toBe("/planificador?x=1");
  });

  it("bloquea open redirects", () => {
    expect(safeRedirectPath("//evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("https://evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("/\\evil.com")).toBe("/dashboard");
    expect(safeRedirectPath(undefined)).toBe("/dashboard");
  });
});
