"use client";

import { useLayoutEffect } from "react";
import { applyTheme, clearTheme } from "./theme";
import { resolveTheme, subscribePreference, subscribeSystem } from "./use-theme";

/**
 * Aplica el tema mientras la app privada está montada. Al llegar por
 * navegación de cliente el script del <head> no se ejecuta; al salir hacia
 * la landing se vuelve al claro. Lee el almacenamiento directamente: con
 * el estado de React, la hidratación pintaría un instante en claro.
 */
export function ThemeController() {
  useLayoutEffect(() => {
    const sync = () => applyTheme(resolveTheme());
    sync();
    const stopPreference = subscribePreference(sync);
    const stopSystem = subscribeSystem(sync);
    return () => {
      stopPreference();
      stopSystem();
      clearTheme();
    };
  }, []);

  return null;
}
