"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useOfflineSession } from "@/core/offline/offline-query-provider";
import { DEFAULT_CURRENCY, currencySymbol, parseStoredCurrency, type CurrencyCode } from "../lib/currency";
import { savePreferences } from "../lib/save";

const STORAGE_KEY = "zentlet.currency.v1";
/** Cuenta a la que pertenece la moneda guardada: el dispositivo puede compartirse. */
const OWNER_KEY = "zentlet.currency.owner.v1";

interface DeviceCurrency {
  code: CurrencyCode;
  /** `null` en valores de versiones anteriores, que no guardaban el dueño. */
  owner: string | null;
}

/**
 * La moneda es de la cuenta (se guarda en el servidor) y el dispositivo
 * conserva una copia para pintarla al instante y sin conexión. Vive fuera
 * de React para que el snapshot del servidor sea estable y no provoque un
 * salto de hidratación.
 */
const SERVER_SNAPSHOT: DeviceCurrency = { code: DEFAULT_CURRENCY, owner: null };
let snapshot = SERVER_SNAPSHOT;
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
      snapshot = { code: parseStoredCurrency(localStorage.getItem(STORAGE_KEY)), owner: localStorage.getItem(OWNER_KEY) };
    } catch {
      /* almacenamiento no disponible (modo privado) */
    }
  }
  return snapshot;
}

function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

/** La copia sólo vale para su cuenta; la de otra persona no se muestra ni se hereda. */
function currencyFor({ code, owner }: DeviceCurrency, userId: string) {
  return owner === null || owner === userId ? code : DEFAULT_CURRENCY;
}

/** Moneda que ya usa este dispositivo para esta cuenta. */
export function getDeviceCurrency(userId: string) {
  return currencyFor(getSnapshot(), userId);
}

/** Guarda la moneda en el dispositivo sin avisar al servidor. */
export function setDeviceCurrency(userId: string, next: CurrencyCode) {
  loaded = true;
  snapshot = { code: next, owner: userId };
  try {
    localStorage.setItem(STORAGE_KEY, next);
    localStorage.setItem(OWNER_KEY, userId);
  } catch {
    /* sin persistencia: la sesión sigue en memoria */
  }
  for (const listener of listeners) listener();
}

export function useCurrency() {
  const { userId } = useOfflineSession();
  const currencyCode = currencyFor(useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot), userId);

  const setCurrency = useCallback(
    (next: CurrencyCode) => {
      setDeviceCurrency(userId, next);
      savePreferences(userId, { currency: next }).catch(() => {});
    },
    [userId],
  );

  return { currency: currencySymbol(currencyCode), currencyCode, setCurrency };
}
