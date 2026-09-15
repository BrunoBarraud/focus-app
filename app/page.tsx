import * as React from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Hourglass,
  Timer,
  Calendar,
  Target,
  Flame,
  ShieldCheck,
  Compass,
  Quote,
  Layers,
  ChevronRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  let user = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col relative overflow-x-hidden">
      {/* Ambient background glows - Electric Violet */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 -z-10 h-[600px] w-[800px] rounded-full bg-violet-600/15 blur-[160px] pointer-events-none" />
      <div className="fixed top-1/3 -right-40 -z-10 h-[500px] w-[500px] rounded-full bg-fuchsia-600/10 blur-[180px] pointer-events-none" />
      <div className="fixed bottom-0 -left-40 -z-10 h-[500px] w-[500px] rounded-full bg-violet-800/10 blur-[180px] pointer-events-none" />

      {/* 1. Header / Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
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

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#caracteristicas" className="hover:text-violet-300 transition-colors">
              Características
            </a>
            <a href="#filosofia" className="hover:text-violet-300 transition-colors">
              Filosofía Estoica
            </a>
            <a href="#pilares" className="hover:text-violet-300 transition-colors">
              Pilares
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard">
                <Button variant="glow" size="sm" className="gap-2">
                  Ir al Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white">
                    Iniciar Sesión
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="glow" size="sm" className="gap-1.5 shadow-violet-600/30">
                    Comenzar Gratis
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center">
        {/* Violet Pill Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-semibold mb-6 shadow-sm shadow-violet-500/10 animate-fade-in">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          <span>El sistema operativo para tu mejor versión</span>
          <ChevronRight className="h-3 w-3 text-violet-400" />
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
          Domina tu tiempo.{" "}
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">
            Construye hábitos
          </span>{" "}
          con propósito implacable.
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-lg lg:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Focus fusiona la filosofía estoica del <em>Memento Mori</em> con hábitos atómicos, bloques de enfoque profundo y planificación semanal sin distracciones.
        </p>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href={user ? "/dashboard" : "/login"}>
            <Button
              variant="glow"
              size="lg"
              className="w-full sm:w-auto h-12 px-8 text-base font-semibold shadow-xl shadow-violet-600/40 gap-2.5"
            >
              {user ? "Ingresar a mi Dashboard" : "Empezar Gratis Ahora"}
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>

          <Link href="/dashboard">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto h-12 px-8 text-base border-zinc-800 hover:border-violet-500/40 hover:bg-zinc-900/80 gap-2 text-zinc-300 hover:text-white"
            >
              Ver Dashboard
            </Button>
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-violet-400" />
            <span>Datos 100% Privados con Supabase</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-amber-400" />
            <span>Rachas y Consistencia Diaria</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Hourglass className="h-4 w-4 text-violet-400" />
            <span>Memento Mori en Tiempo Real</span>
          </div>
        </div>

        {/* Hero Visual Mockup Preview */}
        <div className="mt-16 sm:mt-20 relative mx-auto max-w-5xl rounded-2xl border border-violet-500/20 bg-zinc-950/80 p-2 sm:p-4 shadow-2xl shadow-violet-950/50 backdrop-blur-2xl">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 sm:p-6 text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="text-xs font-mono text-zinc-400 ml-2">focus.app / dashboard</span>
              </div>
              <span className="text-[11px] font-semibold text-violet-400 uppercase tracking-wider bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                Live Preview
              </span>
            </div>

            {/* Quick Hero Bento Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-zinc-950/80 border border-zinc-800/80 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-violet-400 mb-1">
                  <Hourglass className="h-4 w-4" /> Memento Mori
                </div>
                <p className="text-2xl font-bold font-mono text-white">4.160</p>
                <p className="text-[11px] text-zinc-400">Semanas de vida esperadas</p>
                <div className="mt-2.5 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-400 w-2/5" />
                </div>
              </div>

              <div className="rounded-xl bg-zinc-950/80 border border-zinc-800/80 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
                  <Flame className="h-4 w-4 fill-emerald-400" /> Hábitos Atómicos
                </div>
                <p className="text-2xl font-bold font-mono text-white">100%</p>
                <p className="text-[11px] text-zinc-400">Racha activa de 18 días</p>
                <div className="mt-2.5 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-emerald-500 w-4/5" />
                </div>
              </div>

              <div className="rounded-xl bg-zinc-950/80 border border-zinc-800/80 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
                  <Timer className="h-4 w-4" /> Enfoque Profundo
                </div>
                <p className="text-2xl font-bold font-mono text-white">25:00</p>
                <p className="text-[11px] text-zinc-400">Bloque de deep work sin ruidos</p>
                <div className="mt-2.5 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-amber-500 w-1/2" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Bento Grid: 4 Core Features */}
      <section id="caracteristicas" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-zinc-800/80">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-violet-400 mb-2">
            <Layers className="h-3.5 w-3.5" /> Arquitectura de Alto Rendimiento
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Todo lo necesario para una mente implacable.
          </h2>
          <p className="text-zinc-400 mt-4 text-sm sm:text-base">
            Diseñado sin distracciones, sin notificaciones ruidosas y con foco absoluto en lo que realmente mueve la aguja en tu vida.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Hábitos */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 sm:p-8 hover:border-violet-500/40 hover:bg-zinc-900/60 transition-all group">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 mb-5 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-violet-300 transition-colors">
              Matriz de Hábitos Atómicos
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
              Seguimiento visual día por día del mes. Categorización en Mente, Cuerpo, Trabajo y Espíritu, con cálculo automático de rachas y consistencia.
            </p>
            <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center text-xs text-violet-400 font-semibold gap-1">
              <span>Rachas en tiempo real</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Card 2: Enfoque Pomodoro */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 sm:p-8 hover:border-violet-500/40 hover:bg-zinc-900/60 transition-all group">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 mb-5 group-hover:scale-110 transition-transform">
              <Timer className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-violet-300 transition-colors">
              Temporizador Deep Work
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
              Sesiones de 25 minutos de concentración ininterrumpida y descansos estratégicos, con avisos acústicos por Web Audio y modo zen sin interferencias.
            </p>
            <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center text-xs text-violet-400 font-semibold gap-1">
              <span>Cero distracciones</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Card 3: Planificador Semanal L-D */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 sm:p-8 hover:border-violet-500/40 hover:bg-zinc-900/60 transition-all group">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 mb-5 group-hover:scale-110 transition-transform">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-violet-300 transition-colors">
              Planificador Semanal L-D
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
              Tablero Kanban horizontal dinámico. Asigna prioridades, tareas clave y detecta automáticamente el día actual de la semana para una ejecución fluida.
            </p>
            <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center text-xs text-violet-400 font-semibold gap-1">
              <span>Perspectiva de 7 días</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Card 4: Memento Mori */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 sm:p-8 hover:border-violet-500/40 hover:bg-zinc-900/60 transition-all group">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 mb-5 group-hover:scale-110 transition-transform">
              <Hourglass className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-violet-300 transition-colors">
              Memento Mori Consciente
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
              Calcula con precisión las semanas vividas frente a tu expectativa de vida real. Una dosis estoica de perspectiva para valorar cada instante presente.
            </p>
            <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center text-xs text-violet-400 font-semibold gap-1">
              <span>Perspectiva de vida</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Card 5: Rueda de la Vida */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 sm:p-8 hover:border-violet-500/40 hover:bg-zinc-900/60 transition-all group">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 mb-5 group-hover:scale-110 transition-transform">
              <Compass className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-violet-300 transition-colors">
              Rueda de la Vida & Objetivos
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
              Gráfico de radar interactivo para calibrar tus 8 áreas fundamentales (salud, finanzas, carrera, relaciones), metas anuales y lista de sueños.
            </p>
            <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center text-xs text-violet-400 font-semibold gap-1">
              <span>Equilibrio holístico</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Card 6: Eat That Frog */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 sm:p-8 hover:border-violet-500/40 hover:bg-zinc-900/60 transition-all group">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 mb-5 group-hover:scale-110 transition-transform">
              <Target className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-violet-300 transition-colors">
              El Sapo del Día (Eat That Frog)
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
              Define la tarea más difícil y crucial cada mañana. Cómetela a primera hora y siente el impulso imparable de haber conquistado tu mayor reto.
            </p>
            <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center text-xs text-violet-400 font-semibold gap-1">
              <span>Prioridad absoluta</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* 4. Stoic Philosophy Quote Section */}
      <section id="filosofia" className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full text-center">
        <div className="rounded-3xl border border-violet-500/30 bg-gradient-to-b from-zinc-900/80 via-zinc-950 to-zinc-900/40 p-8 sm:p-14 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -z-10 h-64 w-64 rounded-full bg-violet-600/15 blur-3xl" />
          <Quote className="h-10 w-10 text-violet-400 mx-auto mb-6 opacity-80" />

          <blockquote className="text-xl sm:text-3xl font-serif italic text-zinc-200 leading-relaxed max-w-3xl mx-auto">
            &ldquo;No es que tengamos poco tiempo, sino que perdemos mucho. La vida es lo bastante larga y para la consecución de las cosas más grandes se nos ha dado con generosidad si toda ella se empleara bien.&rdquo;
          </blockquote>

          <p className="text-xs sm:text-sm font-semibold text-violet-400 uppercase tracking-widest mt-6">
            — Lucio Anneo Séneca, De Brevitate Vitae
          </p>
        </div>
      </section>

      {/* 5. Final CTA Banner */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full text-center">
        <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950/90 p-8 sm:p-12 relative overflow-hidden glow-violet">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 via-transparent to-fuchsia-600/10 pointer-events-none" />

          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Comienza a diseñar tu vida hoy mismo.
          </h2>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto mt-3">
            Únete a la filosofía de la productividad consciente. Sin spam, sin distracciones, solo claridad y foco.
          </p>

          <div className="mt-8 flex justify-center">
            <Link href={user ? "/dashboard" : "/login"}>
              <Button variant="glow" size="lg" className="h-12 px-8 text-base shadow-lg shadow-violet-600/40 gap-2">
                {user ? "Ir a mi Dashboard" : "Crear mi Cuenta Gratuita"}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="mt-auto border-t border-zinc-800/80 py-8 px-4 sm:px-6 lg:px-8 bg-zinc-950">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600 text-white font-bold text-xs">
              <Zap className="h-3.5 w-3.5 fill-current" />
            </div>
            <span className="font-semibold text-zinc-200">FOCUS App</span>
            <span>• Productividad & Desarrollo Personal Consciente</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="hover:text-violet-300 transition-colors">
              Dashboard
            </Link>
            <Link href="/login" className="hover:text-violet-300 transition-colors">
              Acceso
            </Link>
            <span>&copy; {new Date().getFullYear()} Focus. Todos los derechos reservados.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
