"use client";

import * as React from "react";
import Link from "next/link";
import { Sheet } from "@/components/ui/sheet";
import { NavigationItems } from "./NavigationItems";
import { Menu, Zap, User, LogOut, LogIn } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { logoutAction, getCurrentUserRoleAction } from "@/app/actions";
import { UserRole } from "@/lib/types";

export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  const [user, setUser] = React.useState<any>(null);
  const [role, setRole] = React.useState<UserRole>("user");

  React.useEffect(() => {
    async function getUserData() {
      try {
        const { user: currentUser, role: currentRole } = await getCurrentUserRoleAction();
        setUser(currentUser);
        setRole(currentRole);
      } catch {
        setUser(null);
        setRole("user");
      }
    }
    getUserData();
  }, [open]);

  const displayName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Invitado";

  return (
    <>
      <header className="lg:hidden sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-zinc-800/80 bg-zinc-950/90 px-4 backdrop-blur-lg">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-sm shadow-violet-600/30">
            <Zap className="h-4 w-4 fill-current" />
          </div>
          <span className="font-bold tracking-tight text-base text-white">
            FOCUS
          </span>
        </Link>

        <button
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile Drawer */}
      <Sheet open={open} onOpenChange={setOpen} side="left">
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2.5 pb-6 border-b border-zinc-800/80">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 text-white">
              <Zap className="h-4 w-4 fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base text-white">FOCUS</span>
              <span className="text-[10px] text-zinc-400">Productividad</span>
            </div>
          </div>

          <div className="flex-1 py-6 overflow-y-auto">
            <NavigationItems onItemClick={() => setOpen(false)} />
          </div>

          {/* User Auth Section in Mobile Drawer */}
          <div className="pt-4 border-t border-zinc-800/80 space-y-3">
            {user ? (
              <div className="rounded-xl bg-zinc-900/60 p-3 border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-zinc-100 truncate">
                        {displayName}
                      </p>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded shrink-0 ${
                          role === "admin"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {role === "admin" ? "👑 Admin" : "Usuario"}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-1.5 py-1 text-xs text-rose-400 hover:bg-zinc-800 rounded-md transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Cerrar Sesión
                  </button>
                </form>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 p-2.5 text-xs font-semibold text-zinc-200 hover:text-white"
              >
                <LogIn className="h-4 w-4 text-emerald-400" />
                <span>Iniciar Sesión / Registro</span>
              </Link>
            )}

            <p className="text-[10px] text-zinc-500 text-center">
              Focus App • Cada usuario con su propia guía
            </p>
          </div>
        </div>
      </Sheet>
    </>
  );
}
