import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Focus • Sistema de Productividad & Crecimiento Personal",
  description:
    "Aplicación integral de hábitos, enfoque profundo, planificación semanal y metas de vida en Dark Mode.",
  openGraph: {
    title: "Focus • Productividad & Crecimiento Personal",
    description: "Tu sistema integral de hábitos, enfoque y metas de vida.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body
        className={`${inter.variable} font-sans bg-[#09090b] text-zinc-100 min-h-screen antialiased selection:bg-emerald-500/20 selection:text-emerald-300`}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
