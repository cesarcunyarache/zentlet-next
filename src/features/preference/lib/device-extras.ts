import { preferencesSchema, type PreferenceExtras } from "../schemas/preference.schema";
import { savePreferences } from "./save";

const KEY_PREFIX = "zentlet.extras";
const extrasKey = (userId: string) => `${KEY_PREFIX}:${userId}`;
const EMPTY: PreferenceExtras = {};

const cache = new Map<string, PreferenceExtras>();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key !== null && !event.key.startsWith(KEY_PREFIX)) return;
  cache.clear();
  notify();
}

export function subscribeDeviceExtras(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function parseExtras(raw: string | null): PreferenceExtras {
  if (raw === null) return EMPTY;
  try {
    return preferencesSchema.shape.extras.parse(JSON.parse(raw));
  } catch {
    return EMPTY;
  }
}

function readStored(userId: string) {
  try {
    return parseExtras(localStorage.getItem(extrasKey(userId)));
  } catch {
    return EMPTY;
  }
}

export function getDeviceExtras(userId: string): PreferenceExtras {
  if (!cache.has(userId)) cache.set(userId, readStored(userId));
  return cache.get(userId) ?? EMPTY;
}

export function setDeviceExtras(userId: string, next: PreferenceExtras) {
  const clean = parseExtras(JSON.stringify(next));
  cache.set(userId, clean);
  try {
    localStorage.setItem(extrasKey(userId), JSON.stringify(clean));
  } catch {}
  notify();
}

export function changeExtras(userId: string, changes: PreferenceExtras) {
  setDeviceExtras(userId, { ...getDeviceExtras(userId), ...changes });
  savePreferences(userId, { extras: changes }).catch(() => {});
}
