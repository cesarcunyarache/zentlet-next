"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useOfflineSession } from "@/core/offline/offline-query-provider";
import { DEFAULT_CURRENCY, currencySymbol, parseStoredCurrency, type CurrencyCode } from "../lib/currency";
import { savePreferences } from "../lib/save";

const STORAGE_KEY = "zentlet.currency.v1";

/**
 * La moneda es de la cuenta (se guarda en el servidor) y el dispositivo
 * conserva una copia para pintarla al instante y sin conexión. Vive fuera
 * de React para que el snapshot del servidor sea estable y no provoque un
 * salto de hidratación.
 */
let snapshot: CurrencyCode = DEFAULT_CURRENCY;
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
      snapshot = parseStoredCurrency(localStorage.getItem(STORAGE_KEY));
    } catch {
      /* almacenamiento no disponible (modo privado) */
    }
  }
  return snapshot;
}

function getServerSnapshot() {
  return DEFAULT_CURRENCY;
}

/** Moneda que ya usa este dispositivo. */
export const getDeviceCurrency = getSnapshot;

/** Guarda la moneda en el dispositivo sin avisar al servidor. */
export function setDeviceCurrency(next: CurrencyCode) {
  loaded = true;
  snapshot = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* sin persistencia: la sesión sigue en memoria */
  }
  for (const listener of listeners) listener();
}

export function useCurrency() {
  const { userId } = useOfflineSession();
  const currencyCode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setCurrency = useCallback(
    (next: CurrencyCode) => {
      setDeviceCurrency(next);
      savePreferences(userId, { currency: next }).catch(() => {});
    },
    [userId],
  );

  return { currency: currencySymbol(currencyCode), currencyCode, setCurrency };
}
