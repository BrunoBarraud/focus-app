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
    badge: null,
  },
  {
    label: "Hábitos",
    href: "/habitos",
    icon: CheckSquare,
    badge: "6 activos",
  },
  {
    label: "Planificador",
    href: "/planificador",
    icon: Calendar,
    badge: "Semana L-D",
  },
  {
    label: "Objetivos & Metas",
    href: "/objetivos",
    icon: Target,
    badge: null,
  },
  {
    label: "Enfoque (Pomodoro)",
    href: "/enfoque",
    icon: Timer,
    badge: "25m",
  },
];

export function NavigationItems({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1.5 px-2">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            className={cn(
              "group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 select-none",
              isActive
                ? "bg-zinc-800/90 text-white shadow-sm border border-zinc-700/60 font-semibold"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 hover:border hover:border-zinc-800/60"
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-zinc-400 group-hover:text-zinc-200 group-hover:bg-zinc-800"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span>{item.label}</span>
            </div>

            {item.badge && (
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                  isActive
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                )}
              >
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
