"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PomodoroMode } from "@/lib/types";
import { formatTime, cn } from "@/lib/utils";
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Flame,
  Volume2,
  VolumeX,
  Target,
  Coffee,
  CheckCircle2,
} from "lucide-react";

const MODE_CONFIG: Record<
  PomodoroMode,
  { label: string; duration: number; color: string; ringColor: string }
> = {
  focus: {
    label: "Enfoque Profundo",
    duration: 25 * 60,
    color: "text-emerald-400",
    ringColor: "#10b981",
  },
  short_break: {
    label: "Descanso Corto",
    duration: 5 * 60,
    color: "text-teal-400",
    ringColor: "#14b8a6",
  },
  long_break: {
    label: "Descanso Largo",
    duration: 15 * 60,
    color: "text-amber-400",
    ringColor: "#f59e0b",
  },
};

export function PomodoroTimer() {
  const [mode, setMode] = React.useState<PomodoroMode>("focus");
  const [timeLeft, setTimeLeft] = React.useState(MODE_CONFIG.focus.duration);
  const [isRunning, setIsRunning] = React.useState(false);
  const [completedSessions, setCompletedSessions] = React.useState(0);
  const [currentTask, setCurrentTask] = React.useState("");
  const [soundEnabled, setSoundEnabled] = React.useState(true);

  // Timer interval
  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      // Session finished
      setIsRunning(false);
      if (mode === "focus") {
        setCompletedSessions((prev) => prev + 1);
        setMode("short_break");
        setTimeLeft(MODE_CONFIG.short_break.duration);
      } else {
        setMode("focus");
        setTimeLeft(MODE_CONFIG.focus.duration);
      }

      // Audio notification beep (Web Audio API)
      if (soundEnabled && typeof window !== "undefined") {
        try {
          const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.frequency.value = 587.33; // D5 note
          osc.type = "sine";
          gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
          osc.start();
          osc.stop(audioCtx.currentTime + 1.2);
        } catch {
          // Ignore
        }
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, mode, soundEnabled]);

  const switchMode = (newMode: PomodoroMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(MODE_CONFIG[newMode].duration);
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(MODE_CONFIG[mode].duration);
  };

  // Circular SVG calculations
  const totalDuration = MODE_CONFIG[mode].duration;
  const progressRatio = (totalDuration - timeLeft) / totalDuration;
  const radius = 140;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressRatio);

  return (
    <div className="flex flex-col items-center justify-center max-w-2xl mx-auto py-4 space-y-8">
      {/* Title & Ambience */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <Sparkles className="h-3.5 w-3.5" /> Estado de Flujo
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Sesión de Enfoque
        </h1>
        <p className="text-sm text-zinc-400 max-w-md mx-auto">
          Elimina toda distracción. Tu atención es tu recurso más valioso.
        </p>
      </div>

      {/* Mode Selector Buttons */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-zinc-800 shadow-md">
        <button
          type="button"
          onClick={() => switchMode("focus")}
          className={cn(
            "px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all cursor-pointer",
            mode === "focus"
              ? "bg-zinc-800 text-emerald-400 font-bold shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          Enfoque (25m)
        </button>

        <button
          type="button"
          onClick={() => switchMode("short_break")}
          className={cn(
            "px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all cursor-pointer",
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
            "px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all cursor-pointer",
            mode === "long_break"
              ? "bg-zinc-800 text-amber-400 font-bold shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          Descanso largo (15m)
        </button>
      </div>

      {/* Big Circular Display */}
      <div className="relative flex items-center justify-center">
        {/* Ambient glow behind timer */}
        <div
          className={cn(
            "absolute h-72 w-72 rounded-full blur-3xl transition-opacity duration-700 pointer-events-none",
            isRunning ? "opacity-30 bg-emerald-500" : "opacity-10 bg-zinc-600"
          )}
        />

        <svg className="w-[320px] h-[320px] sm:w-[360px] sm:h-[360px] -rotate-90">
          {/* Background circle */}
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            stroke="#27272a"
            strokeWidth="8"
            fill="transparent"
          />
          {/* Animated progress circle */}
          <circle
            cx="50%"
            cy="50%"
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
          <span className="font-mono text-5xl sm:text-7xl font-extrabold tracking-tighter text-white">
            {formatTime(timeLeft)}
          </span>

          <span className={cn("text-xs font-semibold uppercase tracking-widest mt-2", MODE_CONFIG[mode].color)}>
            {MODE_CONFIG[mode].label}
          </span>

          {/* Sound toggle badge */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="mt-4 flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 bg-zinc-900/80 px-2.5 py-1 rounded-full border border-zinc-800 transition-colors"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="h-3.5 w-3.5 text-emerald-400" /> Sonido activado
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
          className="h-12 w-12 rounded-2xl border-zinc-800 text-zinc-400 hover:text-white"
          title="Reiniciar temporizador"
        >
          <RotateCcw className="h-5 w-5" />
        </Button>

        <button
          type="button"
          onClick={toggleTimer}
          className={cn(
            "flex items-center justify-center h-16 w-36 rounded-2xl text-base font-bold transition-all shadow-xl active:scale-95 cursor-pointer",
            isRunning
              ? "bg-amber-500 text-zinc-950 hover:bg-amber-400 shadow-amber-500/20"
              : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-emerald-500/20"
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
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-1.5 font-semibold text-zinc-300">
            <Target className="h-3.5 w-3.5 text-emerald-400" /> Tarea en curso:
          </span>
          <span className="text-[10px] text-zinc-400 font-mono">
            {completedSessions} Pomodoros hoy
          </span>
        </div>
        <input
          type="text"
          value={currentTask}
          onChange={(e) => setCurrentTask(e.target.value)}
          placeholder="¿En qué tarea pondrás tu foco ahora?"
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {/* Session Progress Footer */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-center">
          <p className="text-[10px] uppercase font-semibold text-zinc-400">
            Bloques Hoy
          </p>
          <p className="text-xl font-bold text-white mt-0.5">
            {completedSessions}{" "}
            <span className="text-xs text-zinc-400 font-normal">pomodoros</span>
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-center">
          <p className="text-[10px] uppercase font-semibold text-zinc-400">
            Tiempo Enfocado
          </p>
          <p className="text-xl font-bold text-emerald-400 mt-0.5">
            {completedSessions * 25}{" "}
            <span className="text-xs text-zinc-400 font-normal">minutos</span>
          </p>
        </div>
      </div>
    </div>
  );
}
