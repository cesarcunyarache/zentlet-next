"use client";

import { useCallback, useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY, isThemePreference, type ThemePreference } from "./theme";

const DEFAULT_PREFERENCE: ThemePreference = "system";
const DARK_QUERY = "(prefers-color-scheme: dark)";

let preference: ThemePreference = DEFAULT_PREFERENCE;
let loaded = false;
const listeners = new Set<() => void>();

export function subscribePreference(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getPreference() {
  if (!loaded) {
    loaded = true;
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (isThemePreference(stored)) preference = stored;
    } catch {
      /* almacenamiento no disponible (modo privado) */
    }
  }
  return preference;
}

export function subscribeSystem(listener: () => void) {
  const query = matchMedia(DARK_QUERY);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

const getSystemDark = () => matchMedia(DARK_QUERY).matches;

export function resolveTheme(): "light" | "dark" {
  const current = getPreference();
  if (current !== "system") return current;
  return getSystemDark() ? "dark" : "light";
}

/** Preferencia de tema del dispositivo (se guarda en este navegador). */
export function useThemePreference() {
  const current = useSyncExternalStore(subscribePreference, getPreference, () => DEFAULT_PREFERENCE);

  const setPreference = useCallback((next: ThemePreference) => {
    preference = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* sin persistencia: la sesión sigue en memoria */
    }
    for (const listener of listeners) listener();
  }, []);

  return { preference: current, setPreference };
}
