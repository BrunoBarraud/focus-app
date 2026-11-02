import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Zap,
  ArrowRight,
  CheckCircle2,
  Timer,
  Calendar,
  Target,
  Bell,
  Smartphone,
  Compass,
} from "lucide-react";

export const dynamic = "force-dynamic";

const PILLARS = [
  {
    icon: CheckCircle2,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    title: "Hábitos",
    description:
      "Una matriz del mes para marcar cada día lo que cumpliste. Ves tu racha actual, tu mejor racha y cuánto te falta para la meta del mes.",
  },
  {
    icon: Calendar,
    color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    title: "Planificación",
    description:
      "Organizá la semana de lunes a domingo o mirá el mes completo. Tareas puntuales o que se repiten, con hora, prioridad y calendarios separados.",
  },
  {
    icon: Timer,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    title: "Foco",
    description:
      "Un temporizador Pomodoro para trabajar en bloques de 25 o 50 minutos, con descansos y aviso sonoro al terminar.",
  },
] as const;

const STEPS = [
  {
    title: "Planificá tu semana",
    description: "Cargá las tareas de cada día y marcá cuáles se repiten todas las semanas.",
  },
  {
    title: "Marcá tus hábitos",
    description: "Un clic por día. La racha y el progreso del mes se calculan solos.",
  },
  {
    title: "Trabajá con foco",
    description: "Elegí la tarea más importante y arrancá un bloque de concentración.",
  },
] as const;

const EXTRAS = [
  {
    icon: Bell,
    title: "Recordatorios",
    description: "Te avisa 30, 15 y 5 minutos antes de cada tarea con horario.",
  },
  {
    icon: Target,
    title: "Metas con hitos",
    description: "Dividí cada meta en pasos concretos y mirá cómo avanza a medida que los cumplís.",
  },
  {
    icon: Compass,
    title: "Rueda de la vida",
    description: "Evaluá del 1 al 10 cómo estás en cada área y detectá dónde poner energía.",
  },
  {
    icon: Smartphone,
    title: "En tu celular",
    description: "Instalala desde el navegador y usala como una app más.",
  },
] as const;

export default async function LandingPage() {
  const user = await getViewer();
  const primaryHref = user ? "/dashboard" : "/login?modo=registro";
  const primaryLabel = user ? "Ir a mi panel" : "Crear mi cuenta";

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col relative overflow-x-hidden">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 -z-10 h-[600px] w-[800px] rounded-full bg-violet-600/15 blur-[160px] pointer-events-none" />
      <div className="fixed bottom-0 -left-40 -z-10 h-[500px] w-[500px] rounded-full bg-violet-800/10 blur-[180px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-md shadow-violet-600/30">
              <Zap className="h-5 w-5 fill-current" />
            </div>
            <span className="font-bold tracking-tight text-lg text-white">Focus</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#funciones" className="hover:text-white transition-colors">
              Funciones
            </a>
            <a href="#como-funciona" className="hover:text-white transition-colors">
              Cómo funciona
            </a>
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <Link href="/dashboard">
                <Button variant="glow" size="sm" className="gap-2">
                  Ir a mi panel
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white">
                    Iniciar sesión
                  </Button>
                </Link>
                <Link href="/login?modo=registro">
                  <Button variant="glow" size="sm">
                    Crear cuenta
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-16 pb-16 sm:pt-24 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full text-center">
        <p className="text-sm font-semibold text-violet-300 mb-5">Hábitos · Planificación · Foco</p>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-[1.1]">
          Tus hábitos, tu semana y tu foco,{" "}
          <span className="bg-gradient-to-r from-violet-400 to-indigo-300 bg-clip-text text-transparent">
            en un solo lugar.
          </span>
        </h1>
        <p className="mt-6 text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Focus te ayuda a sostener hábitos, planificar la semana y trabajar en bloques de concentración, con
          recordatorios que te avisan antes de cada tarea.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href={primaryHref} className="w-full sm:w-auto">
            <Button variant="glow" size="lg" className="w-full sm:w-auto h-12 px-8 gap-2.5">
              {primaryLabel}
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          {!user && (
            <Link href="/login" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8">
                Ya tengo cuenta
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Los tres pilares */}
      <section id="funciones" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full border-t border-zinc-800/80 scroll-mt-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Tres herramientas que se complementan</h2>
          <p className="text-zinc-400 mt-3 text-base">
            Lo que planificás, lo que repetís todos los días y el tiempo que le dedicás, conectado.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PILLARS.map(({ icon: Icon, color, title, description }) => (
            <div key={title} className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 sm:p-7">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl border mb-5 ${color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white">{title}</h3>
              <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full scroll-mt-16">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight text-center mb-12">Cómo funciona</h2>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-6">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">
                {i + 1}
              </span>
              <h3 className="text-lg font-bold text-white mt-4">{step.title}</h3>
              <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Extras */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full border-t border-zinc-800/80">
        <h2 className="text-2xl font-bold text-white tracking-tight mb-8">También incluye</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {EXTRAS.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex gap-3">
              <Icon className="h-5 w-5 text-violet-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-white">{title}</h3>
                <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full text-center">
        <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950/90 p-8 sm:p-12">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">Empezá a organizar tu semana</h2>
          <p className="text-base text-zinc-400 max-w-xl mx-auto mt-3">
            Crear la cuenta lleva un minuto. Después cargás tus hábitos y tus tareas, y listo.
          </p>
          <div className="mt-8 flex justify-center">
            <Link href={primaryHref}>
              <Button variant="glow" size="lg" className="h-12 px-8 gap-2">
                {primaryLabel}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-800/80 py-8 px-4 sm:px-6 lg:px-8 bg-zinc-950">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-400">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600 text-white">
              <Zap className="h-3.5 w-3.5 fill-current" />
            </div>
            <span className="font-semibold text-zinc-200">Focus</span>
            <span>· Hábitos, planificación y foco</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href={user ? "/dashboard" : "/login"} className="hover:text-white transition-colors">
              {user ? "Mi panel" : "Iniciar sesión"}
            </Link>
            <span>&copy; {new Date().getFullYear()} Focus</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
