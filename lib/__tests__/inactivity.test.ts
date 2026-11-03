import { describe, expect, it } from "vitest";
import { isQuietHour, planInactivityNudges, visibleStreak, type InactivityInput } from "../notifications/inactivity";

const TZ = "America/Argentina/Buenos_Aires"; // UTC-3, sin horario de verano

function input(overrides: Partial<InactivityInput>): InactivityInput {
  return {
    userId: "u1",
    now: new Date("2026-11-02T18:00:00Z"), // 15:00 en Buenos Aires
    lastSeenAt: new Date("2026-11-02T15:30:00Z"), // 12:30 local
    everyHours: 2,
    timeZone: TZ,
    streakCurrent: 3,
    streakLastDay: "2026-11-02",
    ...overrides,
  };
}

describe("avisos por inactividad", () => {
  it("no avisa antes de cumplir el intervalo", () => {
    expect(planInactivityNudges(input({ everyHours: 5 }))).toEqual([]);
  });

  it("avisa una vez por tramo, con una clave estable", () => {
    const first = planInactivityNudges(input({}));
    expect(first).toHaveLength(1);
    expect(first[0].kind).toBe("inactivity");
    expect(first[0].body).toContain("2 horas");

    // Un minuto después sigue siendo el mismo tramo: misma clave (se deduplica).
    const again = planInactivityNudges(input({ now: new Date("2026-11-02T18:01:00Z") }));
    expect(again[0].dedupe_key).toBe(first[0].dedupe_key);

    // Dos horas más tarde es otro tramo: clave nueva.
    const next = planInactivityNudges(input({ now: new Date("2026-11-02T20:00:00Z") }));
    expect(next[0].dedupe_key).not.toBe(first[0].dedupe_key);
  });

  it("respeta el horario de silencio (22 a 9, hora local)", () => {
    expect(isQuietHour(22)).toBe(true);
    expect(isQuietHour(8)).toBe(true);
    expect(isQuietHour(9)).toBe(false);
    // 02:00 local
    expect(planInactivityNudges(input({ now: new Date("2026-11-03T05:00:00Z") }))).toEqual([]);
  });

  it("avisa que la racha está en riesgo a la noche si hoy no entró", () => {
    const nudges = planInactivityNudges(
      input({
        now: new Date("2026-11-02T23:30:00Z"), // 20:30 local
        lastSeenAt: new Date("2026-11-01T23:00:00Z"),
        streakLastDay: "2026-11-01",
        streakCurrent: 4,
      })
    );
    const kinds = nudges.map((n) => n.kind).sort();
    expect(kinds).toEqual(["inactivity", "streak_risk"]);
    expect(nudges.find((n) => n.kind === "streak_risk")?.title).toContain("4 días");
  });
});

describe("racha visible", () => {
  it("se mantiene si usó la app hoy o ayer, y se corta después", () => {
    expect(visibleStreak(5, "2026-11-02", "2026-11-02")).toBe(5);
    expect(visibleStreak(5, "2026-11-01", "2026-11-02")).toBe(5);
    expect(visibleStreak(5, "2026-10-31", "2026-11-02")).toBe(0);
    expect(visibleStreak(5, null, "2026-11-02")).toBe(0);
  });
});
