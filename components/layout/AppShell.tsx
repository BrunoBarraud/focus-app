"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = pathname === "/" || pathname === "/login";

  if (isPublicRoute) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 relative overflow-x-hidden selection:bg-violet-500/30 selection:text-violet-200">
        {/* Background ambient lighting - Electric Violet */}
        <div className="fixed top-0 left-1/3 -z-10 h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[150px] pointer-events-none" />
        <div className="fixed bottom-0 right-1/4 -z-10 h-[450px] w-[450px] rounded-full bg-fuchsia-600/5 blur-[160px] pointer-events-none" />
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col md:flex-row relative overflow-x-hidden selection:bg-violet-500/30 selection:text-violet-200">
      {/* Background ambient lighting - Electric Violet */}
      <div className="fixed top-0 left-1/4 -z-10 h-96 w-96 rounded-full bg-violet-600/10 blur-[140px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 -z-10 h-96 w-96 rounded-full bg-fuchsia-600/5 blur-[150px] pointer-events-none" />

      {/* Desktop Fixed Sidebar */}
      <Sidebar />

      {/* Mobile Top Navigation */}
      <MobileNav />

      {/* Main Content Area - Optimized for 1366x768 and smaller viewports */}
      <main className="flex-1 md:pl-64 min-h-screen flex flex-col min-w-0">
        <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-6 min-w-0">
          {children}
        </div>
      </main>
    </div>
  );
}

