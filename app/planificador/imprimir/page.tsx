import type { Metadata } from "next";
import { PrintView } from "@/components/calendario/PrintView";
import { getPlannerData } from "@/lib/data";
import { isIsoDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Imprimir horario" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ImprimirPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const fecha = typeof params.fecha === "string" && isIsoDate(params.fecha) ? params.fecha : undefined;
  const calendars = typeof params.cal === "string" ? params.cal.split(",").filter(Boolean) : undefined;
  const data = await getPlannerData();

  return <PrintView data={data} initialDate={fecha} initialMode={params.vista === "mes" ? "month" : "week"} initialCalendars={calendars} />;
}
