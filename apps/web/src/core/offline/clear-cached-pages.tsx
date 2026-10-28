"use client";

import { useEffect } from "react";
import { clearCachedPages } from "./local-data";

/**
 * En las pantallas de acceso no hay sesión (o está por empezar otra): las
 * páginas privadas guardadas para abrir la app sin red se borran, para que
 * nadie pueda volver a /admin sin pasar por el servidor.
 */
export function ClearCachedPages() {
  useEffect(() => {
    void clearCachedPages().catch(() => {});
  }, []);
  return null;
}
