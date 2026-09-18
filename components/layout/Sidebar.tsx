"use client";

import * as React from "react";
import Link from "next/link";
import { NavigationItems } from "./NavigationItems";
import { Zap, Flame, User, LogOut, LogIn, Settings } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { logoutAction } from "@/app/actions";
import { ProfileModal } from "./ProfileModal";

export function Sidebar() {
  const [user, setUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [profileOpen, setProfileOpen] = React.useState(false);

  React.useEffect(() => {
    async function getUser() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        setUser(data.user);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    getUser();
  }, []);

  const fullName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Invitado";
  const firstName = fullName.split(" ")[0];
  const role: "admin" | "user" =
    user?.user_metadata?.role === "admin" || user?.app_metadata?.role === "admin"
      ? "admin"
      : "user";

  return (
    <>
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 z-40 w-64 flex-col border-r border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl">
        {/* Brand Header */}
        <div className="flex h-16 items-center px-6 border-b border-zinc-800/80">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-md shadow-violet-600/30 group-hover:scale-105 transition-transform">
              <Zap className="h-5 w-5 fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-lg text-white group-hover:text-violet-400 transition-colors">
                FOCUS
              </span>
              <span className="text-[10px] text-zinc-400 tracking-wider uppercase font-medium">
                Productividad Consciente
              </span>
            </div>
          </Link>
        </div>

        {/* Main Nav Items */}
        <div className="flex-1 overflow-y-auto py-6">
          <div className="px-5 mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Navegación
            </p>
          </div>
          <NavigationItems />
        </div>

        {/* Bottom User / Authentication Section */}
        <div className="p-4 border-t border-zinc-800/80">
          {user ? (
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div
                  onClick={() => setProfileOpen(true)}
                  className="flex items-center gap-2.5 min-w-0 cursor-pointer group/user flex-1"
                  title="Configurar Perfil & Memento Mori"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 group-hover/user:border-violet-500/50 transition-colors">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-zinc-100 truncate group-hover/user:text-violet-300 transition-colors">
                        {firstName}
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

                <button
                  type="button"
                  onClick={() => setProfileOpen(true)}
                  className="p-1 rounded-md text-zinc-400 hover:text-violet-300 hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Configuración de Perfil"
                >
                  <Settings className="h-3.5 w-3.5" />
                </button>
              </div>

              <form action={logoutAction}>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 text-[11px] font-medium text-zinc-400 hover:text-rose-400 hover:bg-zinc-800/80 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="h-3 w-3" /> Cerrar Sesión
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-xs font-semibold text-zinc-200 hover:text-white hover:border-violet-500/50 transition-all group"
            >
              <LogIn className="h-4 w-4 text-violet-400 group-hover:scale-110 transition-transform" />
              <span>Iniciar Sesión / Registro</span>
            </Link>
          )}
        </div>
      </aside>

      {/* Modal de edición de perfil */}
      <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}
