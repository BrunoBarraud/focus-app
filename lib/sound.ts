/**
 * Focus App - Sistema de Sonido y Notificaciones Web Audio API
 * Genera tonos armónicos suaves y profesionales inspirados en Apple / macOS sin depender de archivos de audio externos.
 */

// Contexto de audio reutilizable
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    // Puede fallar si todavía no hubo interacción del usuario; no es crítico.
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Sonido de Notificación / Recordatorio de Reunión (Doble chime cristalino estilo Apple)
 */
export function playNotificationSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Primer tono (E5: ~659 Hz)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(659.25, now);
  gain1.gain.setValueAtTime(0.18, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.5);

  // Segundo tono más alto y brillante (B5: ~987 Hz)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(987.77, now + 0.12);
  gain2.gain.setValueAtTime(0.22, now + 0.12);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.12);
  osc2.stop(now + 0.8);
}

/**
 * Sonido de Tarea Completada (Acorde ascendente satisfactorio)
 */
export function playTaskCompletedSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 (Do Mayor)

  frequencies.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = now + index * 0.06;
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.12, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0005, startTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.35);
  });
}

/**
 * Fin de un bloque del Pomodoro. Reutiliza el único AudioContext de la app:
 * crear uno por pitido los acumula y Chrome deja de reproducir sonido.
 */
export function playTimerEndSound(frequency = 880, duration = 0.9) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}
