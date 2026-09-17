"use client";

import * as React from "react";
import { Play, Pause, RotateCcw, Flame, Volume2, VolumeX, Sparkles, Zap, Coffee } from "lucide-react";

export function EditablePomodoro() {
  const [initialSeconds, setInitialSeconds] = React.useState<number>(25 * 60);
  const [timeLeft, setTimeLeft] = React.useState<number>(25 * 60);
  const [isRunning, setIsRunning] = React.useState<boolean>(false);
  const [mode, setMode] = React.useState<"focus" | "deep" | "short_break" | "long_break">("focus");
  const [isEditing, setIsEditing] = React.useState<boolean>(false);
  const [editInput, setEditInput] = React.useState<string>("25:00");
  const [soundEnabled, setSoundEnabled] = React.useState<boolean>(true);
  const [sessionsCompleted, setSessionsCompleted] = React.useState<number>(0);

  // Formatear segundos a MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Sonido con Web Audio API
  const playBeep = () => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch {
      // Ignorar error de audio si no está soportado
    }
  };

  // Temporizador principal
  React.useEffect(() => {
    let interval: any = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      setIsRunning(false);
      playBeep();
      if (mode === "focus" || mode === "deep") {
        setSessionsCompleted((c) => c + 1);
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, mode]);

  // Cambiar modo con presets
  const handleSetMode = (newMode: "focus" | "deep" | "short_break" | "long_break", mins: number) => {
    setIsRunning(false);
    setMode(newMode);
    const totalSecs = mins * 60;
    setInitialSeconds(totalSecs);
    setTimeLeft(totalSecs);
    setEditInput(formatTime(totalSecs));
  };

  // Manejar edición de tiempo (cuando el usuario tipea ej. "45:00")
  const handleTimeBlur = () => {
    setIsEditing(false);
    const trimmed = editInput.trim();
    if (trimmed.includes(":")) {
      const [mStr, sStr] = trimmed.split(":");
      const m = parseInt(mStr, 10) || 0;
      const s = parseInt(sStr, 10) || 0;
      const total = Math.max(10, m * 60 + s);
      setInitialSeconds(total);
      setTimeLeft(total);
      setEditInput(formatTime(total));
    } else {
      const m = parseInt(trimmed, 10) || 25;
      const total = Math.max(10, m * 60);
      setInitialSeconds(total);
      setTimeLeft(total);
      setEditInput(formatTime(total));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleTimeBlur();
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(initialSeconds);
    setEditInput(formatTime(initialSeconds));
  };

  const progressPercent = Math.max(
    0,
    Math.min(100, ((initialSeconds - timeLeft) / (initialSeconds || 1)) * 100)
  );

  // SVG Circular progress params
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="w-full rounded-[22px] border border-white/[0.08] bg-zinc-900/60 backdrop-blur-xl p-6 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col justify-between min-h-[440px] relative overflow-hidden group">
      {/* Background ambient glow */}
      <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-rose-500/20 to-violet-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-inner">
            <Flame className="h-5 w-5 fill-current animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Focus Mode
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-full">
                Hiperenfoque
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              {sessionsCompleted > 0
                ? `${sessionsCompleted} bloque${sessionsCompleted > 1 ? "s" : ""} completado${sessionsCompleted > 1 ? "s" : ""} hoy`
                : "Inicia tu primer bloque de concentración profunda"}
            </p>
          </div>
        </div>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-2 text-zinc-400 hover:text-white rounded-xl bg-white/[0.04] border border-white/[0.06] transition-colors cursor-pointer"
          title={soundEnabled ? "Silenciar" : "Activar sonido"}
        >
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      </div>

      {/* Presets de modos */}
      <div className="grid grid-cols-4 gap-1.5 p-1 bg-zinc-950/80 rounded-xl border border-white/[0.06] text-xs font-semibold">
        <button
          type="button"
          onClick={() => handleSetMode("focus", 25)}
          className={`py-1.5 rounded-lg transition-all text-center cursor-pointer ${
            mode === "focus"
              ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          25m
        </button>
        <button
          type="button"
          onClick={() => handleSetMode("deep", 50)}
          className={`py-1.5 rounded-lg transition-all text-center cursor-pointer ${
            mode === "deep"
              ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          50m Deep
        </button>
        <button
          type="button"
          onClick={() => handleSetMode("short_break", 5)}
          className={`py-1.5 rounded-lg transition-all text-center cursor-pointer ${
            mode === "short_break"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          5m Pausa
        </button>
        <button
          type="button"
          onClick={() => handleSetMode("long_break", 15)}
          className={`py-1.5 rounded-lg transition-all text-center cursor-pointer ${
            mode === "long_break"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          15m Break
        </button>
      </div>

      {/* Dial Circular y Display Central de Gran Altura */}
      <div className="flex flex-col items-center justify-center py-6 text-center relative my-auto">
        <div className="relative flex items-center justify-center">
          {/* SVG Circular Ring */}
          <svg className="w-56 h-56 sm:w-64 sm:h-64 -rotate-90 transform" viewBox="0 0 240 240">
            {/* Background Track */}
            <circle
              cx="120"
              cy="120"
              r={radius}
              stroke="currentColor"
              strokeWidth="10"
              className="text-zinc-800/70"
              fill="transparent"
            />
            {/* Active Progress */}
            <circle
              cx="120"
              cy="120"
              r={radius}
              stroke="currentColor"
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="text-violet-500 transition-all duration-500 ease-out drop-shadow-[0_0_12px_rgba(139,92,246,0.6)]"
              fill="transparent"
            />
          </svg>

          {/* Time Display en el centro del dial */}
          <div className="absolute flex flex-col items-center justify-center">
            {isEditing ? (
              <input
                type="text"
                value={editInput}
                onChange={(e) => setEditInput(e.target.value)}
                onBlur={handleTimeBlur}
                onKeyDown={handleKeyDown}
                autoFocus
                className="font-mono text-5xl sm:text-6xl font-black tracking-tight text-white bg-transparent text-center border-b-2 border-violet-500 focus:outline-none w-44"
              />
            ) : (
              <div
                onClick={() => {
                  if (!isRunning) {
                    setIsEditing(true);
                    setEditInput(formatTime(timeLeft));
                  }
                }}
                title={isRunning ? "Pausa para editar" : "Haz clic para editar la duración"}
                className={`font-mono text-5xl sm:text-6xl font-black tracking-tight select-none transition-all ${
                  isRunning
                    ? "text-white drop-shadow-[0_2px_16px_rgba(255,255,255,0.25)]"
                    : "text-zinc-100 hover:text-violet-400 cursor-pointer"
                }`}
              >
                {formatTime(timeLeft)}
              </div>
            )}

            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mt-1">
              {isRunning ? (mode.includes("break") ? "Descanso Activo" : "Enfoque Activo") : "Listo para arrancar"}
            </span>
          </div>
        </div>
      </div>

      {/* Controles Principales Grandes */}
      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => setIsRunning(!isRunning)}
          className={`flex-1 py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg active:scale-95 ${
            isRunning
              ? "bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20"
              : "bg-white hover:bg-zinc-200 text-zinc-950 shadow-white/10 hover:shadow-white/20"
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="h-4 w-4 fill-current" /> Pausar Sesión
            </>
          ) : (
            <>
              <Play className="h-4 w-4 fill-current" /> Iniciar Sesión de Enfoque
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="p-3.5 text-zinc-400 hover:text-white rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all cursor-pointer active:scale-95"
          title="Reiniciar temporizador"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
