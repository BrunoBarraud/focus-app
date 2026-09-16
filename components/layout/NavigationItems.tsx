"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Target,
  Timer,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Hábitos",
    href: "/habitos",
    icon: CheckSquare,
  },
  {
    label: "Planificador",
    href: "/planificador",
    icon: Calendar,
  },
  {
    label: "Objetivos & Metas",
    href: "/objetivos",
    icon: Target,
  },
  {
    label: "Enfoque (Pomodoro)",
    href: "/enfoque",
    icon: Timer,
  },
];

export function NavigationItems({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1.5 px-2">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            className={cn(
              "group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 select-none",
              isActive
                ? "bg-violet-600/15 text-white shadow-sm border border-violet-500/30 font-semibold"
                : "text-zinc-400 hover:bg-zinc-900/90 hover:text-zinc-100 hover:border hover:border-zinc-800/60"
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  isActive
                    ? "bg-violet-500/20 text-violet-400 shadow-sm"
                    : "text-zinc-400 group-hover:text-violet-300 group-hover:bg-zinc-800"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span>{item.label}</span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
