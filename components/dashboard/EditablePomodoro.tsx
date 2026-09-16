"use client";

import * as React from "react";
import { Play, Pause, RotateCcw, Flame, Sparkles, Volume2, VolumeX } from "lucide-react";

export function EditablePomodoro() {
  const [initialSeconds, setInitialSeconds] = React.useState<number>(25 * 60);
  const [timeLeft, setTimeLeft] = React.useState<number>(25 * 60);
  const [isRunning, setIsRunning] = React.useState<boolean>(false);
  const [mode, setMode] = React.useState<"focus" | "short_break" | "long_break">("focus");
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
      if (mode === "focus") {
        setSessionsCompleted((c) => c + 1);
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, mode]);

  // Cambiar modo con presets
  const handleSetMode = (newMode: "focus" | "short_break" | "long_break", mins: number) => {
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
    // Parse MM:SS or MM
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

  return (
    <div className="w-full rounded-[22px] border border-white/[0.08] bg-zinc-900/60 backdrop-blur-xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Flame className="h-4 w-4 fill-current" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Focus Mode
            </h2>
            <p className="text-[11px] text-zinc-400">
              {sessionsCompleted} sesiones de hiperenfoque hoy
            </p>
          </div>
        </div>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-2 text-zinc-400 hover:text-white rounded-xl bg-white/[0.04] border border-white/[0.06] transition-colors"
          title={soundEnabled ? "Silenciar" : "Activar sonido"}
        >
          {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Temporizador Central Minimalista con tiempo editable */}
      <div className="flex flex-col items-center justify-center py-6 text-center">
        {/* Barra de progreso sutil Apple */}
        <div className="w-48 h-1.5 bg-zinc-800/80 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-rose-500 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Display con tiempo editable con un clic */}
        <div className="relative group/timer inline-block">
          {isEditing ? (
            <input
              type="text"
              value={editInput}
              onChange={(e) => setEditInput(e.target.value)}
              onBlur={handleTimeBlur}
              onKeyDown={handleKeyDown}
              autoFocus
              className="font-mono text-5xl sm:text-6xl font-black tracking-tight text-white bg-transparent text-center border-b-2 border-violet-500 focus:outline-none w-48 sm:w-56"
            />
          ) : (
            <div
              onClick={() => {
                if (!isRunning) {
                  setIsEditing(true);
                  setEditInput(formatTime(timeLeft));
                }
              }}
              title={isRunning ? "Pausa el temporizador para editar el tiempo" : "Haz clic para editar la duración"}
              className={`font-mono text-5xl sm:text-6xl font-black tracking-tight select-none transition-all ${
                isRunning
                  ? "text-white"
                  : "text-zinc-100 hover:text-violet-400 cursor-pointer"
              }`}
            >
              {formatTime(timeLeft)}
            </div>
          )}

          {!isRunning && !isEditing && (
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mt-2 opacity-60 group-hover/timer:opacity-100 transition-opacity">
              Clic en el tiempo para modificar
            </span>
          )}
        </div>

        {/* Controles Principales */}
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 ${
              isRunning
                ? "bg-amber-500 hover:bg-amber-400 text-zinc-950"
                : "bg-white hover:bg-zinc-200 text-zinc-950"
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="h-3.5 w-3.5 fill-current" /> Pausar
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" /> Iniciar Enfoque
              </>
            )}
          </button>

          <button
            onClick={handleReset}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
            title="Reiniciar temporizador"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Botones limpios debajo para descansos rápidos */}
      <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/[0.06]">
        <button
          onClick={() => handleSetMode("focus", 25)}
          className={`py-2 px-2 rounded-xl text-[11px] font-semibold transition-all border cursor-pointer ${
            mode === "focus"
              ? "bg-violet-600/20 border-violet-500 text-white"
              : "bg-zinc-950/40 border-white/[0.04] text-zinc-400 hover:text-zinc-200"
          }`}
        >
          25m Pomodoro
        </button>

        <button
          onClick={() => handleSetMode("short_break", 5)}
          className={`py-2 px-2 rounded-xl text-[11px] font-semibold transition-all border cursor-pointer ${
            mode === "short_break"
              ? "bg-emerald-600/20 border-emerald-500 text-white"
              : "bg-zinc-950/40 border-white/[0.04] text-zinc-400 hover:text-zinc-200"
          }`}
        >
          5m Corto
        </button>

        <button
          onClick={() => handleSetMode("long_break", 15)}
          className={`py-2 px-2 rounded-xl text-[11px] font-semibold transition-all border cursor-pointer ${
            mode === "long_break"
              ? "bg-blue-600/20 border-blue-500 text-white"
              : "bg-zinc-950/40 border-white/[0.04] text-zinc-400 hover:text-zinc-200"
          }`}
        >
          15m Largo
        </button>
      </div>
    </div>
  );
}
