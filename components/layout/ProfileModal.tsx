"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getProfileAction, updateProfileAction } from "@/app/actions/profile";
import type { UserRole } from "@/lib/types";
import { User, Globe, AlertCircle, Crown } from "lucide-react";
import { useRouter } from "next/navigation";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: UserRole;
}

export function ProfileModal({ open, onOpenChange, role: userRole }: ProfileModalProps) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const [email, setEmail] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [timezone, setTimezone] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    // Si el modal se cierra antes de que llegue la respuesta, se descarta.
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setErrorMsg(null);
      const res = await getProfileAction();
      if (cancelled) return;
      if (res.ok) {
        setEmail(res.data.email);
        setFullName(res.data.fullName || res.data.email.split("@")[0]);
        setTimezone(res.data.timezone);
      } else {
        setErrorMsg(res.error);
      }
      setLoading(false);
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSaving(true);

    const res = await updateProfileAction({
      fullName: fullName.trim() || undefined,
    });
    setSaving(false);

    if (!res.ok) {
      setErrorMsg(res.error);
      return;
    }
    toast.success("Perfil actualizado.");
    router.refresh();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Tu perfil"
      description="Cómo te saluda Focus y desde dónde se calculan tus recordatorios."
      className="border-violet-500/30 shadow-violet-950/30"
    >
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <div className="h-6 w-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <p className="text-xs text-zinc-400">Cargando tus datos...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Email (Readonly) */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              disabled
              value={email}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-400 cursor-not-allowed"
            />
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-violet-400" /> Nombre
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Zona horaria (se detecta sola al abrir la app) */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-violet-400" /> Zona horaria
            </label>
            <input
              type="text"
              disabled
              value={timezone ?? "Se detecta al abrir la app"}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-400 cursor-not-allowed"
            />
            <span className="text-xs text-zinc-400 mt-1 block">
              Se toma de tu navegador y se usa para enviarte los recordatorios a tiempo.
            </span>
          </div>

          {/* Rol de Usuario (Lectura protegida) */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5 text-amber-400" /> Rol
              </label>
              <span
                className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  userRole === "admin"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-zinc-800 text-zinc-400 border border-zinc-700/50"
                }`}
              >
                {userRole === "admin" ? "Administrador" : "Usuario"}
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-snug">
              {userRole === "admin"
                ? "Podés ver y responder los mensajes de soporte de todos los usuarios."
                : "Ves y gestionás solo tus propios datos y mensajes de soporte."}
            </p>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-zinc-800/80">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="glow"
              size="sm"
              disabled={saving}
              className="gap-2"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
