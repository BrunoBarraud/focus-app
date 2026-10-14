import { describe, expect, it } from "vitest";
import {
  addDays,
  isIsoDate,
  isoDateInZone,
  mondayOffset,
  monthDates,
  startOfWeek,
  weekDates,
  weekDayOf,
  zonedTimeToUtc,
} from "../dates";

describe("fechas de calendario", () => {
  it("valida fechas ISO reales", () => {
    expect(isIsoDate("2026-10-14")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("14/10/2026")).toBe(false);
    expect(isIsoDate("Fin de año")).toBe(false);
  });

  it("suma días cruzando meses y años", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("calcula el día de la semana y la semana lunes-domingo", () => {
    expect(weekDayOf("2026-10-14")).toBe("X"); // miércoles
    expect(weekDayOf("2026-10-18")).toBe("D");
    expect(startOfWeek("2026-10-18")).toBe("2026-10-12"); // domingo -> lunes anterior
    expect(weekDates("2026-10-14")).toEqual([
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
    ]);
  });

  it("arma la grilla del mes", () => {
    expect(monthDates(2026, 1)).toHaveLength(28);
    expect(monthDates(2028, 1)).toHaveLength(29);
    expect(mondayOffset(2026, 9)).toBe(3); // 1/10/2026 es jueves
  });
});

describe("zonas horarias (servidor en UTC)", () => {
  it("obtiene la fecha local de un instante", () => {
    // 01:30 UTC del 15/10 todavía es 14/10 en Buenos Aires (UTC-3).
    const instant = new Date("2026-10-15T01:30:00Z");
    expect(isoDateInZone(instant, "America/Argentina/Buenos_Aires")).toBe("2026-10-14");
    expect(isoDateInZone(instant, "Europe/Madrid")).toBe("2026-10-15");
  });

  it("convierte hora de pared local a UTC", () => {
    expect(zonedTimeToUtc("2026-10-14", "14:30", "America/Argentina/Buenos_Aires").toISOString()).toBe(
      "2026-10-14T17:30:00.000Z"
    );
  });

  it("respeta el horario de verano", () => {
    // Madrid: UTC+1 en invierno, UTC+2 en verano.
    expect(zonedTimeToUtc("2026-01-15", "09:00", "Europe/Madrid").toISOString()).toBe(
      "2026-01-15T08:00:00.000Z"
    );
    expect(zonedTimeToUtc("2026-07-15", "09:00", "Europe/Madrid").toISOString()).toBe(
      "2026-07-15T07:00:00.000Z"
    );
  });
});
