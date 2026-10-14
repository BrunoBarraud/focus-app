"use client";

import * as React from "react";

const TICK_MS = 250;

/**
 * Cuenta regresiva basada en el reloj real (`endsAt`), no en contar ticks.
 * Antes se descontaba 1 por cada setInterval de 1s: el intervalo se recreaba
 * cada segundo y los navegadores lo frenan en pestañas de fondo, así que un
 * Pomodoro de 25 min podía durar bastante más.
 */
export function useCountdown(
  initialSeconds: number,
  onFinish: (controls: { reset: (seconds: number) => void }) => void
) {
  const [timeLeft, setTimeLeftState] = React.useState(initialSeconds);
  const [isRunning, setIsRunning] = React.useState(false);
  const timeLeftRef = React.useRef(initialSeconds);
  const onFinishRef = React.useRef(onFinish);

  React.useEffect(() => {
    onFinishRef.current = onFinish;
  });

  const setTimeLeft = React.useCallback((seconds: number) => {
    timeLeftRef.current = seconds;
    setTimeLeftState(seconds);
  }, []);

  React.useEffect(() => {
    if (!isRunning) return;
    const endsAt = Date.now() + timeLeftRef.current * 1000;
    let finished = false;

    const tick = () => {
      if (finished) return;
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setTimeLeft(left);
      if (left === 0) {
        finished = true;
        setIsRunning(false);
        onFinishRef.current({ reset: (seconds) => setTimeLeft(seconds) });
      }
    };

    const interval = setInterval(tick, TICK_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [isRunning, setTimeLeft]);

  return {
    timeLeft,
    isRunning,
    toggle: () => setIsRunning((r) => !r && timeLeftRef.current > 0),
    pause: () => setIsRunning(false),
    /** Detiene y fija un nuevo tiempo. */
    reset: (seconds: number) => {
      setIsRunning(false);
      setTimeLeft(seconds);
    },
  };
}
