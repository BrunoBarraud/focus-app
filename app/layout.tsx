import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { getViewer } from "@/lib/auth";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Focus · Hábitos, planificación y foco",
  description:
    "Sostené tus hábitos, planificá la semana y trabajá en bloques de concentración, con recordatorios antes de cada tarea.",
  manifest: "/manifest.json",
  openGraph: {
    title: "Focus · Hábitos, planificación y foco",
    description: "Tus hábitos, tu semana y tu foco, en un solo lugar.",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // La sesión se resuelve una vez en el servidor y baja como prop: antes,
  // Sidebar y MobileNav llamaban cada uno a una server action al montarse.
  const viewer = await getViewer();

  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans bg-[#09090b] text-zinc-100 min-h-screen antialiased selection:bg-violet-500/30 selection:text-violet-200`}
        suppressHydrationWarning
      >
        <AppShell viewer={viewer}>{children}</AppShell>
      </body>
    </html>
  );
}
