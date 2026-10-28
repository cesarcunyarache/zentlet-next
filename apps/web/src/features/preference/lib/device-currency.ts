import { parseStoredCurrency, type CurrencyCode } from "./currency";
import { savePreferences } from "./save";

const KEY_PREFIX = "zentlet.currency";
const currencyKey = (userId: string) => `${KEY_PREFIX}:${userId}`;
const LEGACY_KEY = "zentlet.currency.v1";
const LEGACY_OWNER_KEY = "zentlet.currency.owner.v1";

const cache = new Map<string, CurrencyCode | null>();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

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
    if (localStorage.getItem(LEGACY_OWNER_KEY) !== userId) return null;
    return parseStoredCurrency(localStorage.getItem(LEGACY_KEY));
  } catch {
    return null;
  }
}

export function getDeviceCurrency(userId: string): CurrencyCode | null {
  if (!cache.has(userId)) cache.set(userId, readStored(userId));
  return cache.get(userId) ?? null;
}

export function setDeviceCurrency(userId: string, next: CurrencyCode) {
  const changed = getDeviceCurrency(userId) !== next;
  cache.set(userId, next);
  try {
    localStorage.setItem(currencyKey(userId), next);
    const legacyOwner = localStorage.getItem(LEGACY_OWNER_KEY);
    if (legacyOwner === null || legacyOwner === userId) {
      localStorage.removeItem(LEGACY_KEY);
      localStorage.removeItem(LEGACY_OWNER_KEY);
    }
  } catch {}
  if (changed) notify();
}

export function changeCurrency(userId: string, next: CurrencyCode) {
  setDeviceCurrency(userId, next);
  savePreferences(userId, { currency: next }).catch(() => {});
}
