"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { playTimerEndSound } from "@/lib/sound";
import { useCountdown } from "@/lib/use-countdown";
import { useDailyFocus } from "@/lib/use-daily-focus";
import { formatTime, cn } from "@/lib/utils";
import { Play, Pause, RotateCcw, Timer, Volume2, VolumeX, Target } from "lucide-react";

type PomodoroMode = "focus" | "short_break" | "long_break";

const MODE_CONFIG: Record<
  PomodoroMode,
  { label: string; duration: number; color: string; ringColor: string }
> = {
  focus: {
    label: "Enfoque",
    duration: 25 * 60,
    color: "text-violet-400",
    ringColor: "#8b5cf6",
  },
  short_break: {
    label: "Descanso corto",
    duration: 5 * 60,
    color: "text-teal-400",
    ringColor: "#14b8a6",
  },
  long_break: {
    label: "Descanso largo",
    duration: 15 * 60,
    color: "text-amber-400",
    ringColor: "#f59e0b",
  },
};

export function PomodoroTimer() {
  const [mode, setMode] = React.useState<PomodoroMode>("focus");
  const { blocks, minutes, addBlock } = useDailyFocus();
  const [currentTask, setCurrentTask] = React.useState("");
  const [soundEnabled, setSoundEnabled] = React.useState(true);

  const { timeLeft, isRunning, toggle: toggleTimer, reset } = useCountdown(MODE_CONFIG.focus.duration, (controls) => {
    // Sesión terminada: alternar entre enfoque y descanso.
    const nextMode: PomodoroMode = mode === "focus" ? "short_break" : "focus";
    if (mode === "focus") addBlock(MODE_CONFIG.focus.duration / 60);
    setMode(nextMode);
    controls.reset(MODE_CONFIG[nextMode].duration);
    if (soundEnabled) playTimerEndSound(587.33, 1.2);
  });

  const switchMode = (newMode: PomodoroMode) => {
    setMode(newMode);
    reset(MODE_CONFIG[newMode].duration);
  };

  const resetTimer = () => {
    reset(MODE_CONFIG[mode].duration);
  };

  // Circular SVG calculations
  const totalDuration = MODE_CONFIG[mode].duration;
  const progressRatio = (totalDuration - timeLeft) / totalDuration;
  const radius = 125;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressRatio);

  return (
    <div className="flex flex-col items-center justify-center max-w-2xl mx-auto py-2 space-y-5 sm:space-y-6">
      {/* Title & Ambience */}
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-violet-400 uppercase tracking-widest px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20">
          <Timer className="h-3.5 w-3.5" /> Pomodoro
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Sesión de enfoque
        </h1>
        <p className="text-sm text-zinc-400 max-w-md mx-auto">
          Trabajá 25 minutos en una sola tarea y después tomate un descanso.
        </p>
      </div>

      {/* Mode Selector Buttons */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-zinc-800 shadow-md">
        <button
          type="button"
          onClick={() => switchMode("focus")}
          className={cn(
            "px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all cursor-pointer",
            mode === "focus"
              ? "bg-zinc-800 text-violet-400 font-bold shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          Enfoque (25m)
        </button>

        <button
          type="button"
          onClick={() => switchMode("short_break")}
          className={cn(
            "px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all cursor-pointer",
            mode === "short_break"
              ? "bg-zinc-800 text-teal-400 font-bold shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          Descanso corto (5m)
        </button>

        <button
          type="button"
          onClick={() => switchMode("long_break")}
          className={cn(
            "px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all cursor-pointer",
            mode === "long_break"
              ? "bg-zinc-800 text-amber-400 font-bold shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          Descanso largo (15m)
        </button>
      </div>

      {/* Temporizador circular */}
      <div className="relative flex items-center justify-center">
        {/* Ambient glow behind timer */}
        <div
          className={cn(
            "absolute h-64 w-64 rounded-full blur-3xl transition-opacity duration-700 pointer-events-none",
            isRunning ? "opacity-35 bg-violet-600" : "opacity-10 bg-zinc-600"
          )}
        />

        <svg viewBox="0 0 290 290" className="w-[250px] h-[250px] sm:w-[290px] sm:h-[290px] -rotate-90">
          {/* Background circle */}
          <circle
            cx="145"
            cy="145"
            r={radius}
            stroke="#27272a"
            strokeWidth="8"
            fill="transparent"
          />
          {/* Animated progress circle */}
          <circle
            cx="145"
            cy="145"
            r={radius}
            stroke={MODE_CONFIG[mode].ringColor}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-500 ease-out"
          />
        </svg>

        {/* Center Digital Content */}
        <div className="absolute flex flex-col items-center text-center select-none">
          <span className="font-mono text-5xl sm:text-6xl font-extrabold tracking-tighter text-white">
            {formatTime(timeLeft)}
          </span>

          <span className={cn("text-xs font-semibold uppercase tracking-widest mt-1.5", MODE_CONFIG[mode].color)}>
            {MODE_CONFIG[mode].label}
          </span>

          {/* Sound toggle badge */}
          <button
            type="button"
            aria-pressed={soundEnabled}
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="mt-3 flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer hover:text-zinc-200 bg-zinc-900/80 px-2.5 py-1 rounded-full border border-zinc-800 transition-colors"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="h-3.5 w-3.5 text-violet-400" /> Sonido activado
              </>
            ) : (
              <>
                <VolumeX className="h-3.5 w-3.5 text-zinc-400" /> Silenciado
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Play / Pause / Reset Controls */}
      <div className="flex items-center gap-4">
        <Button
          onClick={resetTimer}
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-xl border-zinc-800 text-zinc-400 hover:text-white"
          title="Reiniciar temporizador"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>

        <button
          type="button"
          onClick={toggleTimer}
          className={cn(
            "flex items-center justify-center h-14 w-36 rounded-xl text-base font-bold transition-all shadow-xl active:scale-95 cursor-pointer",
            isRunning
              ? "bg-amber-500 text-zinc-950 hover:bg-amber-400 shadow-amber-500/20"
              : "bg-violet-600 text-white hover:bg-violet-500 shadow-violet-600/30"
          )}
        >
          {isRunning ? (
            <span className="flex items-center gap-2">
              <Pause className="h-5 w-5 fill-current" /> Pausar
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Play className="h-5 w-5 fill-current" /> Iniciar
            </span>
          )}
        </button>
      </div>

      {/* Focus Target / Current Task input */}
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-1.5 font-semibold text-zinc-300">
            <Target className="h-3.5 w-3.5 text-violet-400" /> Tarea en curso
          </span>
        </div>
        <input
          type="text"
          value={currentTask}
          onChange={(e) => setCurrentTask(e.target.value)}
          placeholder="¿En qué vas a trabajar ahora?"
          aria-label="Tarea en curso"
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
        />
      </div>

      {/* Session Progress Footer */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-center">
          <p className="text-xs uppercase font-semibold text-zinc-400">
            Bloques de hoy
          </p>
          <p className="text-xl font-bold text-white mt-0.5">
            {blocks}{" "}
            <span className="text-xs text-zinc-400 font-normal">{blocks === 1 ? "bloque" : "bloques"}</span>
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-center">
          <p className="text-xs uppercase font-semibold text-zinc-400">
            Tiempo enfocado
          </p>
          <p className="text-xl font-bold text-violet-400 mt-0.5">
            {minutes}{" "}
            <span className="text-xs text-zinc-400 font-normal">minutos</span>
          </p>
        </div>
      </div>
    </div>
  );
}
