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
  title: "Focus • Sistema de Productividad & Crecimiento Personal",
  description:
    "Aplicación integral de hábitos, enfoque profundo, planificación semanal y metas de vida en Dark Mode.",
  manifest: "/manifest.json",
  openGraph: {
    title: "Focus • Productividad & Crecimiento Personal",
    description: "Tu sistema integral de hábitos, enfoque y metas de vida.",
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
