"use client";

import * as React from "react";

const noopSubscribe = () => () => {};

/** true en el cliente, false en el render del servidor y en la hidratación. */
export function useIsClient(): boolean {
  return React.useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

/**
 * Valor que solo existe en el navegador (zona horaria, hora local...).
 * `getSnapshot` tiene que devolver un primitivo o un valor estable.
 */
export function useClientValue<T>(getSnapshot: () => T, serverValue: T): T {
  return React.useSyncExternalStore(noopSubscribe, getSnapshot, () => serverValue);
}

/**
 * Estado local inicializado desde props del servidor que se REEMPLAZA cuando el
 * Server Component revalida y manda datos nuevos. Ajusta el estado durante el
 * render (patrón recomendado por React) en vez de copiar props en un efecto,
 * que provoca un render extra con datos viejos.
 */
export function useServerState<T>(serverValue: T) {
  const [state, setState] = React.useState(serverValue);
  const [lastServerValue, setLastServerValue] = React.useState(serverValue);
  if (serverValue !== lastServerValue) {
    setLastServerValue(serverValue);
    setState(serverValue);
  }
  return [state, setState] as const;
}
