"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { updateUserProfile, getCurrentUserRoleAction } from "@/app/actions";
import { User, Calendar, Target, AlertCircle, Check, Crown, Shield } from "lucide-react";
import { useRouter } from "next/navigation";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const [email, setEmail] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [birthDate, setBirthDate] = React.useState("1995-06-15");
  const [targetAge, setTargetAge] = React.useState(80);
  const [userRole, setUserRole] = React.useState<"admin" | "user">("user");

  React.useEffect(() => {
    if (!open) return;

    async function loadData() {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      try {
        const { user, role: fetchedRole } = await getCurrentUserRoleAction();

        if (user) {
          setEmail(user.email || "");
          const metaName = user.user_metadata?.full_name || "";
          const metaBirth = user.user_metadata?.birth_date || "";
          setUserRole(fetchedRole);

          const supabase = createClient();

          // Cargar settings desde Supabase
          const { data: settings } = await supabase
            .from("user_settings")
            .select("birth_date, target_age")
            .eq("user_id", user.id)
            .maybeSingle();

          setFullName(metaName || user.email?.split("@")[0] || "");
          setBirthDate(settings?.birth_date || metaBirth || "1995-06-15");
          setTargetAge(settings?.target_age || 80);
        }
      } catch (err: any) {
        console.error("Error cargando perfil:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSaving(true);

    try {
      await updateUserProfile({
        fullName: fullName.trim(),
        birthDate,
        targetAge: Number(targetAge) || 80,
      });

      setSuccessMsg("¡Perfil actualizado con éxito!");
      router.refresh();
      setTimeout(() => {
        onOpenChange(false);
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al actualizar perfil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Configurar Perfil & Memento Mori"
      description="Personaliza tus datos reales para sincronizar tu identidad y expectativa de vida."
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

          {successMsg && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs">
              <Check className="h-4 w-4 shrink-0 text-violet-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Email (Readonly) */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Correo Electrónico (Cuenta)
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
              <User className="h-3.5 w-3.5 text-violet-400" /> Nombre Completo / Apodo
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Birth Date */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-violet-400" /> Fecha de Nacimiento
              </label>
              <input
                type="date"
                required
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none transition-colors"
              />
              <span className="text-[10px] text-zinc-400 mt-1 block">
                Calcula tus semanas vividas
              </span>
            </div>

            {/* Target Age */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-violet-400" /> Expectativa de Vida (Años)
              </label>
              <input
                type="number"
                min={40}
                max={120}
                required
                value={targetAge}
                onChange={(e) => setTargetAge(Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none transition-colors"
              />
              <span className="text-[10px] text-zinc-400 mt-1 block">
                Por defecto: 80 años (~4.160 semanas)
              </span>
            </div>
          </div>

          {/* Rol de Usuario (Lectura protegida) */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5 text-amber-400" /> Rol en la Aplicación
              </label>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  userRole === "admin"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-zinc-800 text-zinc-400 border border-zinc-700/50"
                }`}
              >
                {userRole === "admin" ? "👑 Administrador" : "👤 Usuario Común"}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 leading-tight">
              {userRole === "admin"
                ? "Tienes permisos de Administrador para moderar y responder tickets de soporte y feedback."
                : "Rol estándar. Solo los correos designados como administradores tienen acceso al panel de moderación."}
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
              {saving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
