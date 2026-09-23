"use client";

import { useEffect } from "react";

/**
 * Registra /sw.js sólo en producción: en desarrollo interferiría con la
 * recarga en caliente y serviría código viejo.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // sin SW la app funciona igual, sólo no abre sin conexión
    });
  }, []);

  return null;
}
