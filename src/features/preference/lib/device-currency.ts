import { parseStoredCurrency, type CurrencyCode } from "./currency";
import { savePreferences } from "./save";

/** Una clave por cuenta: el dispositivo puede compartirse. */
const KEY_PREFIX = "zentlet.currency";
const currencyKey = (userId: string) => `${KEY_PREFIX}:${userId}`;
/** Versiones anteriores: una sola moneda por dispositivo y, aparte, su dueño. */
const LEGACY_KEY = "zentlet.currency.v1";
const LEGACY_OWNER_KEY = "zentlet.currency.owner.v1";

/**
 * La moneda es de la cuenta (se guarda en el servidor) y el dispositivo
 * conserva una copia para pintarla al instante y sin conexión. Vive fuera
 * de React, con un caché por cuenta para no leer el almacenamiento en cada
 * render; `null` = este dispositivo aún no tiene la de esa cuenta.
 */
const cache = new Map<string, CurrencyCode | null>();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/** Otra pestaña cambió la moneda (o se borró el almacenamiento: `key` es `null`). */
function onStorage(event: StorageEvent) {
  if (event.key !== null && !event.key.startsWith(KEY_PREFIX)) return;
  cache.clear();
  notify();
}

export function subscribeDeviceCurrency(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function readStored(userId: string): CurrencyCode | null {
  try {
    const stored = localStorage.getItem(currencyKey(userId));
    if (stored !== null) return parseStoredCurrency(stored);
    // de otra cuenta, o sin dueño y no se sabe de quién es: llega del servidor, que ya la tenía
    if (localStorage.getItem(LEGACY_OWNER_KEY) !== userId) return null;
    return parseStoredCurrency(localStorage.getItem(LEGACY_KEY));
  } catch {
    return null; /* almacenamiento no disponible (modo privado) */
  }
}

/** Moneda que ya usa este dispositivo para esta cuenta. */
export function getDeviceCurrency(userId: string): CurrencyCode | null {
  if (!cache.has(userId)) cache.set(userId, readStored(userId));
  return cache.get(userId) ?? null;
}

/** Guarda la moneda en el dispositivo sin avisar al servidor. */
export function setDeviceCurrency(userId: string, next: CurrencyCode) {
  const changed = getDeviceCurrency(userId) !== next;
  cache.set(userId, next);
  try {
    localStorage.setItem(currencyKey(userId), next);
    // lo de versiones anteriores ya pasó a su clave; el de otra cuenta espera a que entre
    const legacyOwner = localStorage.getItem(LEGACY_OWNER_KEY);
    if (legacyOwner === null || legacyOwner === userId) {
      localStorage.removeItem(LEGACY_KEY);
      localStorage.removeItem(LEGACY_OWNER_KEY);
    }
  } catch {
    /* sin persistencia: la sesión sigue en memoria */
  }
  if (changed) notify();
}

/** La elige el usuario: al instante en el dispositivo y, en cuanto se pueda, en la cuenta. */
export function changeCurrency(userId: string, next: CurrencyCode) {
  setDeviceCurrency(userId, next);
  savePreferences(userId, { currency: next }).catch(() => {});
}
