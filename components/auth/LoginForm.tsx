"use client";

import * as React from "react";
import { loginAction, signupAction, type AuthFormState } from "@/app/actions/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useClientValue } from "@/lib/client-hooks";
import { Zap, Lock, Mail, User, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";

const INITIAL_STATE: AuthFormState = {};

export function LoginForm({ next }: { next?: string }) {
  // useActionState: el redirect de la server action funciona de forma nativa
  // (antes se atrapaba el error NEXT_REDIRECT comparando el mensaje).
  const [loginState, loginFormAction, loginPending] = React.useActionState(loginAction, INITIAL_STATE);
  const [signupState, signupFormAction, signupPending] = React.useActionState(signupAction, INITIAL_STATE);
  // Zona horaria del navegador: se guarda al registrarse para los recordatorios.
  const timezone = useClientValue(() => Intl.DateTimeFormat().resolvedOptions().timeZone ?? "", "");

  const errorMsg = loginState.error ?? signupState.error;
  const notice = signupState.notice;
  const loading = loginPending || signupPending;

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8 relative">
      {/* Background ambient lighting */}
      <div className="absolute h-80 w-80 rounded-full bg-violet-600/15 blur-[130px] pointer-events-none" />

      <Card className="w-full max-w-md border-zinc-800/90 bg-zinc-950/80 backdrop-blur-2xl shadow-2xl shadow-violet-950/40 relative z-10">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-600/30 mb-3">
            <Zap className="h-6 w-6 fill-current" />
          </div>
          <CardTitle className="text-2xl font-bold text-white tracking-tight">
            Acceso a Focus
          </CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            Tu santuario personal de hábitos, metas y desarrollo consciente
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {errorMsg && (
            <div role="alert" className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {notice && (
            <div role="status" className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid grid-cols-2 w-full bg-zinc-900 border border-zinc-800/80">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="signup">Crear Cuenta</TabsTrigger>
            </TabsList>

            {/* TAB INICIAR SESIÓN */}
            <TabsContent value="login" className="pt-2">
              <form action={loginFormAction} className="space-y-3.5">
                <input type="hidden" name="next" value={next ?? ""} />
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="tu@correo.com"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900/70 pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <input
                      type="password"
                      name="password"
                      required
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900/70 pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  variant="glow"
                  className="w-full mt-2"
                >
                  {loading ? "Verificando..." : "Ingresar a mi cuenta"}
                </Button>
              </form>
            </TabsContent>

            {/* TAB REGISTRO */}
            <TabsContent value="signup" className="pt-2">
              <form action={signupFormAction} className="space-y-3">
                <input type="hidden" name="timezone" value={timezone} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Nombre
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                      <input
                        type="text"
                        name="firstName"
                        required
                        placeholder="Ej: Bruno"
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900/70 pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Apellido
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="lastName"
                        required
                        placeholder="Ej: Silva"
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Fecha de Nacimiento (opcional)
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <input
                      type="date"
                      name="birthDate"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900/70 pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="tu@correo.com"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900/70 pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Contraseña (mínimo 8 caracteres)
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <input
                      type="password"
                      name="password"
                      required
                      minLength={8}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900/70 pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  variant="glow"
                  className="w-full mt-2"
                >
                  {loading ? "Creando tu espacio..." : "Comenzar mi transformación"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

        </CardContent>
      </Card>
    </div>
  );
}
