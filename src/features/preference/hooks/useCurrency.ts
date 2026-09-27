"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "zentlet.currency.v1";
const DEFAULT_CURRENCY = "S/";

/**
 * La moneda es una preferencia de presentación del dispositivo, no server
 * state: no pasa por TanStack Query ni por la API. Vive fuera de React para
 * que el snapshot del servidor sea estable y no provoque un salto de
 * hidratación.
 */
let snapshot = DEFAULT_CURRENCY;
let loaded = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  if (!loaded) {
    loaded = true;
    try {
      snapshot = localStorage.getItem(STORAGE_KEY) ?? DEFAULT_CURRENCY;
    } catch {
      /* almacenamiento no disponible (modo privado) */
    }
  }
  return snapshot;
}

function getServerSnapshot() {
  return DEFAULT_CURRENCY;
}

export function useCurrency() {
  const currency = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setCurrency = useCallback((next: string) => {
    snapshot = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* sin persistencia: la sesión sigue en memoria */
    }
    for (const listener of listeners) listener();
  }, []);

  return { currency, setCurrency };
}
