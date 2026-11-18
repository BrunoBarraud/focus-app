"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { DAY_NAMES, DAY_SHORT, datesBetween, MONTHS, rangeFor, stepAnchor, titleFor } from "@/lib/calendar-view";
import { PALETTE, normalizeColor } from "@/lib/colors";
import { occurrencesInRange, weekdayKey } from "@/lib/recurrence";
import { assignLanes, buildHourSlots, buildSlots, rowOffset, toMinutes, type TimeSlot } from "@/lib/timetable";
import type { Calendar, PlannerData, PlannerOccurrence } from "@/lib/types";
import { useToday } from "@/lib/use-today";
import { WEEK_DAYS } from "@/lib/dates";
import type { WeekDay } from "@/lib/types";
import { cn } from "@/lib/utils";

type PrintMode = "week" | "month";
type Orientation = "landscape" | "portrait";
type Fill = "solid" | "soft";

/** Área útil de una hoja A4 con márgenes de 10 mm. */
const PAGE = {
  landscape: { w: 277, h: 190 },
  portrait: { w: 190, h: 277 },
} as const;
const TITLE_MM = 13;
const HEADER_MM = 8;

interface PrintViewProps {
  data: PlannerData;
  initialDate?: string;
  initialMode: PrintMode;
  initialCalendars?: string[];
}

export function PrintView(props: PrintViewProps) {
  const today = useToday();
  if (!today) return <div className="min-h-screen bg-zinc-200" />;
  return <PrintBoard {...props} today={today} />;
}

function PrintBoard({ data, initialDate, initialMode, initialCalendars, today }: PrintViewProps & { today: string }) {
  const [mode, setMode] = React.useState<PrintMode>(initialMode);
  const [date, setDate] = React.useState(initialDate ?? today);
  const [selected, setSelected] = React.useState<Set<string>>(() => {
    const valid = (initialCalendars ?? []).filter((id) => data.calendars.some((c) => c.id === id));
    return new Set(valid.length ? valid : data.calendars.filter((c) => !c.hidden).map((c) => c.id));
  });
  const [grid, setGrid] = React.useState("auto");
  const [showDates, setShowDates] = React.useState(true);
  const [includeTasks, setIncludeTasks] = React.useState(true);
  // null = automático (lunes a viernes, más sábado/domingo si tienen algo).
  const [chosenDays, setChosenDays] = React.useState<WeekDay[] | null>(null);
  const [orientation, setOrientation] = React.useState<Orientation>("landscape");
  const [fill, setFill] = React.useState<Fill>("solid");
  const [customTitle, setCustomTitle] = React.useState("");

  const calendarById = React.useMemo(() => new Map(data.calendars.map((c) => [c.id, c])), [data.calendars]);
  const completions = React.useMemo(() => new Set(data.completions), [data.completions]);

  const range = rangeFor(mode, date);
  const occurrences = occurrencesInRange(data.events, completions, range.from, range.to).filter(
    (o) => selected.has(o.calendarId) && (includeTasks || o.kind !== "task")
  );

  // Fin de semana: automático = solo si hay algo el sábado o el domingo.
  const hasWeekendItems = occurrences.some((o) => {
    const k = weekdayKey(o.occurrenceDate);
    return k === "S" || k === "D" || o.occurrenceEndDate !== o.occurrenceDate;
  });
  const activeDays: WeekDay[] =
    chosenDays ?? (mode === "month" || hasWeekendItems ? WEEK_DAYS : WEEK_DAYS.slice(0, 5));
  const toggleDay = (day: WeekDay) => {
    const next = activeDays.includes(day) ? activeDays.filter((d) => d !== day) : [...activeDays, day];
    if (next.length) setChosenDays(WEEK_DAYS.filter((d) => next.includes(d)));
  };
  const sameDays = (list: WeekDay[]) => list.length === activeDays.length && list.every((d) => activeDays.includes(d));

  // Grilla de la semana: por horas o por los bloques de un calendario.
  const timed = occurrences.filter((o) => !o.allDay && o.startTime && o.occurrenceEndDate === o.occurrenceDate);
  const slotCalendars = data.calendars.filter((c) => c.useSlots && selected.has(c.id));
  let gridCalendar: Calendar | undefined;
  if (grid === "auto") {
    const firstSlot = timed.find((o) => calendarById.get(o.calendarId)?.useSlots);
    gridCalendar =
      firstSlot && timed.every((o) => calendarById.get(o.calendarId)?.useSlots) ? calendarById.get(firstSlot.calendarId) : undefined;
  } else if (grid !== "hours") {
    gridCalendar = slotCalendars.find((c) => c.id === grid);
  }
  let slots: TimeSlot[];
  if (gridCalendar) {
    slots = buildSlots(gridCalendar.schedule);
  } else {
    const starts = timed.map((o) => Math.floor(toMinutes(o.startTime!) / 60));
    const ends = timed.map((o) => Math.ceil(toMinutes(o.endTime ?? o.startTime!) / 60 + 0.5));
    slots = timed.length ? buildHourSlots(Math.min(...starts), Math.min(24, Math.max(...ends))) : buildHourSlots(8, 20);
  }

  const singleCalendar = selected.size === 1 ? calendarById.get([...selected][0]) : undefined;
  const defaultTitle =
    mode === "month"
      ? titleFor("month", date)
      : showDates
        ? titleFor("week", date)
        : singleCalendar
          ? `Horario · ${singleCalendar.name}`
          : "Horario semanal";
  const title = customTitle.trim() || defaultTitle;
  const page = PAGE[orientation];

  const toggleCalendar = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const control = "rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-800 focus:border-violet-500 focus:outline-none";
  const chip = (active: boolean) =>
    cn(
      "px-3 py-1.5 text-sm rounded-md cursor-pointer font-medium",
      active ? "bg-violet-600 text-white" : "text-zinc-600 hover:text-zinc-900"
    );

  return (
    <div className="min-h-screen bg-zinc-200 text-zinc-900 print:bg-white">
      <style>{`
        @page { size: A4 ${orientation}; margin: 10mm; }
        @media print {
          html, body { background: #fff !important; }
          .print-sheet { box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
        }
        .print-sheet, .print-sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>

      {/* Controles (no se imprimen) */}
      <div className="print:hidden sticky top-0 z-10 border-b border-zinc-300 bg-white/95 backdrop-blur px-4 py-3">
        <div className="max-w-6xl mx-auto space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/planificador" className="inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 mr-2">
              <ArrowLeft className="h-4 w-4" /> Planificador
            </Link>
            <div className="flex rounded-lg border border-zinc-300 p-0.5">
              <button type="button" onClick={() => setMode("week")} aria-pressed={mode === "week"} className={chip(mode === "week")}>
                Semana
              </button>
              <button type="button" onClick={() => setMode("month")} aria-pressed={mode === "month"} className={chip(mode === "month")}>
                Mes
              </button>
            </div>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setDate((d) => stepAnchor(mode, d, -1))}
                aria-label="Anterior"
                className="p-1.5 rounded-lg hover:bg-zinc-100 cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <input
                type="date"
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                aria-label="Fecha"
                className={control}
              />
              <button
                type="button"
                onClick={() => setDate((d) => stepAnchor(mode, d, 1))}
                aria-label="Siguiente"
                className="p-1.5 rounded-lg hover:bg-zinc-100 cursor-pointer"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <input
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder={defaultTitle}
              aria-label="Título de la hoja"
              maxLength={80}
              className={cn(control, "min-w-0 flex-1 sm:flex-none sm:w-64")}
            />
            <button
              type="button"
              onClick={() => window.print()}
              className="ml-auto inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 cursor-pointer"
            >
              <Printer className="h-4 w-4" /> Imprimir / Guardar PDF
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-zinc-500">Días:</span>
            <div className="flex gap-1">
              {WEEK_DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  aria-pressed={activeDays.includes(d)}
                  title={DAY_NAMES[d]}
                  className={cn(
                    "h-8 w-10 rounded-lg border text-xs font-semibold capitalize cursor-pointer",
                    activeDays.includes(d) ? "bg-violet-600 border-violet-600 text-white" : "border-zinc-300 text-zinc-500 hover:text-zinc-900"
                  )}
                >
                  {DAY_SHORT[d]}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setChosenDays(WEEK_DAYS.slice(0, 5))}
              aria-pressed={sameDays(WEEK_DAYS.slice(0, 5))}
              className={cn("px-2.5 h-8 rounded-lg border text-xs font-medium cursor-pointer", sameDays(WEEK_DAYS.slice(0, 5)) ? "border-violet-600 text-violet-700 bg-violet-50" : "border-zinc-300 text-zinc-600 hover:text-zinc-900")}
            >
              Lunes a viernes
            </button>
            <button
              type="button"
              onClick={() => setChosenDays(WEEK_DAYS)}
              aria-pressed={sameDays(WEEK_DAYS)}
              className={cn("px-2.5 h-8 rounded-lg border text-xs font-medium cursor-pointer", sameDays(WEEK_DAYS) ? "border-violet-600 text-violet-700 bg-violet-50" : "border-zinc-300 text-zinc-600 hover:text-zinc-900")}
            >
              Toda la semana
            </button>
            {chosenDays && (
              <button type="button" onClick={() => setChosenDays(null)} className="text-xs text-zinc-500 hover:text-zinc-900 underline cursor-pointer">
                Automático
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-zinc-500">Calendarios:</span>
              {data.calendars.map((c) => (
                <label key={c.id} className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleCalendar(c.id)} className="accent-violet-600" />
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: PALETTE[normalizeColor(c.color)].hex }} />
                  {c.icon ? `${c.icon} ` : ""}
                  {c.name}
                </label>
              ))}
            </div>
            {mode === "week" && (
              <select value={grid} onChange={(e) => setGrid(e.target.value)} aria-label="Grilla" className={control}>
                <option value="auto">Grilla automática</option>
                <option value="hours">Por horas</option>
                {data.calendars
                  .filter((c) => c.useSlots)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      Bloques de {c.name}
                    </option>
                  ))}
              </select>
            )}
            {mode === "week" && (
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={showDates} onChange={(e) => setShowDates(e.target.checked)} className="accent-violet-600" />
                Mostrar fechas
              </label>
            )}
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={includeTasks} onChange={(e) => setIncludeTasks(e.target.checked)} className="accent-violet-600" />
              Incluir tareas
            </label>
            <select value={orientation} onChange={(e) => setOrientation(e.target.value as Orientation)} aria-label="Orientación" className={control}>
              <option value="landscape">A4 horizontal</option>
              <option value="portrait">A4 vertical</option>
            </select>
            <select value={fill} onChange={(e) => setFill(e.target.value as Fill)} aria-label="Colores" className={control}>
              <option value="solid">Colores llenos</option>
              <option value="soft">Colores suaves (menos tinta)</option>
            </select>
          </div>
          <p className="text-xs text-zinc-500">
            Para el PDF, en el diálogo de impresión elegí «Guardar como PDF» como destino. Si no salen los colores, activá «Gráficos de fondo»; desactivá «Encabezados y pies de página» y dejá la escala en 100 % (Predeterminado).
          </p>
        </div>
      </div>

      {/* Hoja */}
      <div className="overflow-x-auto py-6 print:p-0 print:overflow-visible">
        <div
          lang="es"
          className="print-sheet mx-auto bg-white shadow-xl"
          style={{ width: `${page.w}mm`, height: `${page.h - 1}mm`, padding: "10mm", boxSizing: "content-box", overflow: "hidden" }}
        >
          <header className="flex items-end justify-between border-b-2 border-zinc-900" style={{ height: `${TITLE_MM - 3}mm`, marginBottom: "3mm" }}>
            <h1 className="font-bold first-letter:uppercase" style={{ fontSize: "16pt", lineHeight: 1.1 }}>
              {title}
            </h1>
            <span className="text-zinc-500" style={{ fontSize: "8pt" }}>
              {[...selected]
                .map((id) => calendarById.get(id))
                .filter(Boolean)
                .map((c) => `${c!.icon ? `${c!.icon} ` : ""}${c!.name}`)
                .join(" · ")}
            </span>
          </header>

          {mode === "week" ? (
            <WeekSheet
              days={datesBetween(range.from, range.to).filter((d) => activeDays.includes(weekdayKey(d)))}
              occurrences={occurrences}
              calendarById={calendarById}
              slots={slots}
              slotMode={Boolean(gridCalendar)}
              showDates={showDates}
              fill={fill}
              height={page.h - 1 - TITLE_MM}
            />
          ) : (
            <MonthSheet
              date={date}
              occurrences={occurrences}
              calendarById={calendarById}
              weekdays={activeDays}
              fill={fill}
              height={page.h - 1 - TITLE_MM}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------
// Utilidades de color para papel
// --------------------------------------------------------------------------------

function colorOf(occ: PlannerOccurrence, calendarById: Map<string, Calendar>) {
  return PALETTE[normalizeColor(occ.color ?? calendarById.get(occ.calendarId)?.color)].hex;
}

function blockStyle(hex: string, fill: Fill): React.CSSProperties {
  return fill === "solid"
    ? { background: hex, color: "#fff", border: `0.3mm solid ${hex}` }
    : { background: `${hex}1f`, color: "#18181b", borderLeft: `1mm solid ${hex}` };
}

const pt = (n: number) => `${n}pt`;

/**
 * Achica la letra de cada bloque (`data-fit` = tamaño inicial en pt) hasta que
 * el texto entre entero; si ni así entra, esconde los detalles (`data-detail`).
 * Se mide en pantalla con el mismo tamaño en mm que tiene la hoja impresa.
 */
function useFitText(ref: React.RefObject<HTMLElement | null>) {
  React.useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const overflows = (el: HTMLElement) => el.scrollHeight > el.clientHeight + 0.5 || el.scrollWidth > el.clientWidth + 0.5;
    for (const el of root.querySelectorAll<HTMLElement>("[data-fit]")) {
      const details = el.querySelectorAll<HTMLElement>("[data-detail]");
      details.forEach((d) => (d.style.display = ""));
      let size = Number(el.dataset.fit) || 8;
      el.style.fontSize = `${size}pt`;
      while (overflows(el) && size > 6) {
        size -= 0.25;
        el.style.fontSize = `${size}pt`;
      }
      if (overflows(el)) {
        details.forEach((d) => (d.style.display = "none"));
        while (overflows(el) && size > 5) {
          size -= 0.25;
          el.style.fontSize = `${size}pt`;
        }
      }
    }
  });
}

// --------------------------------------------------------------------------------
// Semana
// --------------------------------------------------------------------------------

function WeekSheet({
  days,
  occurrences,
  calendarById,
  slots,
  slotMode,
  showDates,
  fill,
  height,
}: {
  days: string[];
  occurrences: PlannerOccurrence[];
  calendarById: Map<string, Calendar>;
  slots: TimeSlot[];
  slotMode: boolean;
  showDates: boolean;
  fill: Fill;
  height: number;
}) {
  const isBanner = (o: PlannerOccurrence) => o.allDay || !o.startTime || o.occurrenceEndDate !== o.occurrenceDate;
  const banners = new Map(days.map((d) => [d, occurrences.filter((o) => isBanner(o) && o.occurrenceDate <= d && o.occurrenceEndDate >= d)]));
  const maxBanners = Math.min(3, Math.max(0, ...[...banners.values()].map((l) => l.length)));
  const bannerMm = maxBanners ? maxBanners * 5 + 1.5 : 0;
  const outside: PlannerOccurrence[] = [];
  const timedByDay = new Map<string, PlannerOccurrence[]>(days.map((d) => [d, []]));
  for (const occ of occurrences) {
    if (isBanner(occ) || !timedByDay.has(occ.occurrenceDate)) continue;
    if (rowOffset(slots, toMinutes(occ.startTime!)) === null) outside.push(occ);
    else timedByDay.get(occ.occurrenceDate)!.push(occ);
  }
  const footMm = outside.length ? 5 : 0;
  const rowMm = Math.max(4, (height - HEADER_MM - bannerMm - footMm - 1) / Math.max(1, slots.length));
  const labelMm = slotMode ? 24 : 12;
  const columns = `${labelMm}mm repeat(${days.length}, minmax(0, 1fr))`;
  const line = "0.2mm solid #d4d4d8";
  const rootRef = React.useRef<HTMLDivElement>(null);
  useFitText(rootRef);

  return (
    <div ref={rootRef}>
      <div style={{ display: "grid", gridTemplateColumns: columns, borderTop: line, borderLeft: line }}>
        {/* Encabezado */}
        <div style={{ height: `${HEADER_MM}mm`, borderRight: line, borderBottom: line, background: "#f4f4f5" }} />
        {days.map((day) => (
          <div
            key={day}
            className="flex items-center justify-center gap-1.5 font-semibold uppercase tracking-wide"
            style={{ height: `${HEADER_MM}mm`, borderRight: line, borderBottom: line, background: "#f4f4f5", fontSize: pt(8.5) }}
          >
            {showDates ? (
              <>
                <span className="text-zinc-500">{DAY_SHORT[weekdayKey(day)]}</span>
                <span style={{ fontSize: pt(11) }}>{Number(day.slice(8, 10))}</span>
              </>
            ) : (
              DAY_NAMES[weekdayKey(day)]
            )}
          </div>
        ))}

        {/* Todo el día */}
        {maxBanners > 0 && (
          <>
            <div
              className="flex items-start px-1 text-zinc-500"
              style={{ height: `${bannerMm}mm`, borderRight: line, borderBottom: line, fontSize: pt(6.5), paddingTop: "1mm" }}
            >
              Todo el día
            </div>
            {days.map((day) => {
              const list = banners.get(day)!;
              const shown = list.slice(0, list.length > 3 ? 2 : 3);
              return (
                <div key={day} style={{ height: `${bannerMm}mm`, borderRight: line, borderBottom: line, padding: "0.75mm" }} className="space-y-[0.5mm] overflow-hidden">
                  {shown.map((occ) => (
                    <div
                      key={`${occ.id}-${occ.occurrenceDate}`}
                      className="truncate rounded-[1mm] font-semibold"
                      style={{ ...blockStyle(colorOf(occ, calendarById), fill), height: "4.5mm", lineHeight: "4.2mm", padding: "0 1mm", fontSize: pt(7) }}
                    >
                      {occ.title}
                    </div>
                  ))}
                  {list.length > shown.length && (
                    <div className="text-zinc-500" style={{ fontSize: pt(6.5) }}>
                      +{list.length - shown.length} más
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* Horas / bloques */}
        <div style={{ borderRight: line }}>
          {slots.map((slot) => (
            <div
              key={slot.index}
              className={cn("font-mono text-zinc-600 whitespace-nowrap", slotMode ? "flex items-center justify-center" : "text-right")}
              style={{ height: `${rowMm}mm`, borderBottom: line, fontSize: pt(slotMode ? 7 : 7), padding: slotMode ? 0 : "0.6mm 1mm 0 0" }}
            >
              {slotMode ? `${slot.start} – ${slot.end}` : slot.start}
            </div>
          ))}
        </div>

        {days.map((day) => {
          const ranges = timedByDay.get(day)!.map((occ) => {
            const start = rowOffset(slots, toMinutes(occ.startTime!))!;
            const endRaw = occ.endTime ? rowOffset(slots, toMinutes(occ.endTime)) : null;
            const end = Math.max(start + 0.5, endRaw ?? (occ.endTime ? slots.length : start + (slotMode ? 1 : 0.5)));
            return { occ, start, end: Math.min(end, slots.length) };
          });
          const lanes = assignLanes(ranges.map((r) => ({ id: `${r.occ.id}-${r.occ.occurrenceDate}`, start: r.start, end: r.end })));
          return (
            <div key={day} className="relative" style={{ borderRight: line, height: `${slots.length * rowMm}mm` }}>
              {slots.map((slot) => (
                <div key={slot.index} className="absolute inset-x-0" style={{ top: `${slot.index * rowMm}mm`, height: `${rowMm}mm`, borderBottom: line }} />
              ))}
              {ranges.map(({ occ, start, end }) => {
                const key = `${occ.id}-${occ.occurrenceDate}`;
                const { lane, lanes: total } = lanes.get(key) ?? { lane: 0, lanes: 1 };
                const h = (end - start) * rowMm - 0.8;
                return (
                  <div
                    key={key}
                    data-fit={h < 7 ? 6.5 : 8}
                    className={cn(
                      "absolute overflow-hidden rounded-[1.2mm] leading-[1.18] [overflow-wrap:anywhere] hyphens-auto",
                      slotMode && "flex flex-col items-center text-center"
                    )}
                    style={{
                      ...blockStyle(colorOf(occ, calendarById), fill),
                      top: `${start * rowMm + 0.4}mm`,
                      height: `${h}mm`,
                      left: `calc(${(lane / total) * 100}% + 0.6mm)`,
                      width: `calc(${100 / total}% - 1.2mm)`,
                      padding: "0.7mm 0.9mm",
                      // "safe": si el texto no entra, se corta abajo (y se mide) en vez de arriba.
                      ...(slotMode && { justifyContent: "safe center" }),
                    }}
                  >
                    <div className={cn("font-bold", occ.completed && "line-through")}>
                      {occ.title}
                      {occ.tag && occ.tag !== "General" && slotMode && <span className="font-normal"> ({occ.tag})</span>}
                    </div>
                    {h >= 7 && (
                      <div data-detail style={{ fontSize: "0.85em", opacity: 0.85 }} className="font-mono whitespace-nowrap">
                        {occ.startTime}
                        {occ.endTime ? `–${occ.endTime}` : ""}
                      </div>
                    )}
                    {h >= 10 && occ.location && (
                      <div data-detail style={{ fontSize: "0.85em", opacity: 0.85 }}>
                        {occ.location}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      {outside.length > 0 && (
        <p className="text-zinc-600 truncate" style={{ fontSize: pt(7), marginTop: "1mm" }}>
          Fuera de la grilla: {outside.map((o) => `${o.title} (${DAY_SHORT[weekdayKey(o.occurrenceDate)]} ${o.startTime})`).join(" · ")}
        </p>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------------
// Mes
// --------------------------------------------------------------------------------

function MonthSheet({
  date,
  occurrences,
  calendarById,
  weekdays,
  fill,
  height,
}: {
  date: string;
  occurrences: PlannerOccurrence[];
  calendarById: Map<string, Calendar>;
  weekdays: WeekDay[];
  fill: Fill;
  height: number;
}) {
  const month = date.slice(0, 7);
  const { from, to } = rangeFor("month", date);
  const all = datesBetween(from, to);
  // Solo las semanas que tienen algún día del mes (5 o 6).
  const weeks: string[][] = [];
  for (let i = 0; i < all.length; i += 7) {
    const week = all.slice(i, i + 7);
    if (week.some((d) => d.startsWith(month))) weeks.push(week.filter((d) => weekdays.includes(weekdayKey(d))));
  }
  const cols = weekdays.length;
  const cellMm = (height - HEADER_MM - 1) / weeks.length;
  const maxLines = Math.max(1, Math.floor((cellMm - 5) / 3.7));
  const line = "0.2mm solid #d4d4d8";
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, borderTop: line, borderLeft: line }}>
      {WEEK_DAYS.filter((d) => weekdays.includes(d)).map((d) => (
        <div
          key={d}
          className="flex items-center justify-center font-semibold uppercase tracking-wide"
          style={{ height: `${HEADER_MM}mm`, borderRight: line, borderBottom: line, background: "#f4f4f5", fontSize: pt(8.5) }}
        >
          {DAY_NAMES[d]}
        </div>
      ))}
      {weeks.flat().map((day) => {
        const items = occurrences.filter((o) => o.occurrenceDate <= day && o.occurrenceEndDate >= day);
        const shown = items.slice(0, items.length > maxLines ? maxLines - 1 : maxLines);
        const inMonth = day.startsWith(month);
        return (
          <div
            key={day}
            className="overflow-hidden"
            style={{ height: `${cellMm}mm`, borderRight: line, borderBottom: line, padding: "0.8mm", background: inMonth ? "#fff" : "#fafafa" }}
          >
            <div className={cn("text-right font-semibold", inMonth ? "text-zinc-800" : "text-zinc-400")} style={{ fontSize: pt(8), lineHeight: "3.6mm" }}>
              {Number(day.slice(8, 10))}
              {day.endsWith("-01") && ` ${MONTHS[Number(day.slice(5, 7)) - 1].slice(0, 3)}`}
            </div>
            <div className="space-y-[0.4mm]">
              {shown.map((occ) => {
                const hex = colorOf(occ, calendarById);
                const banner = occ.allDay || !occ.startTime || occ.occurrenceEndDate !== occ.occurrenceDate;
                return banner ? (
                  <div
                    key={`${occ.id}-${occ.occurrenceDate}`}
                    className="truncate rounded-[0.8mm] font-semibold"
                    style={{ ...blockStyle(hex, fill), fontSize: pt(6.5), lineHeight: "3.3mm", padding: "0 0.8mm" }}
                  >
                    {occ.title}
                  </div>
                ) : (
                  <div key={`${occ.id}-${occ.occurrenceDate}`} className="flex items-center gap-[0.8mm] truncate" style={{ fontSize: pt(6.5), lineHeight: "3.3mm" }}>
                    <span className="shrink-0 rounded-full" style={{ width: "1.6mm", height: "1.6mm", background: hex }} />
                    <span className="font-mono text-zinc-500 shrink-0">{occ.startTime}</span>
                    <span className={cn("truncate font-medium", occ.completed && "line-through text-zinc-400")}>{occ.title}</span>
                  </div>
                );
              })}
              {items.length > shown.length && (
                <div className="text-zinc-500" style={{ fontSize: pt(6.5) }}>
                  +{items.length - shown.length} más
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
