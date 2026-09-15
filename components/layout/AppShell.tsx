import * as React from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col md:flex-row relative selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Background ambient lighting */}
      <div className="fixed top-0 left-1/4 -z-10 h-96 w-96 rounded-full bg-emerald-600/5 blur-[128px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 -z-10 h-96 w-96 rounded-full bg-teal-600/5 blur-[140px] pointer-events-none" />

      {/* Desktop Fixed Sidebar */}
      <Sidebar />

      {/* Mobile Top Navigation */}
      <MobileNav />

      {/* Main Content Area */}
      <main className="flex-1 md:pl-64 min-h-screen flex flex-col">
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
