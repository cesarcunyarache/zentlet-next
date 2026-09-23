"use client";

import { useEffect, useState } from "react";

/**
 * `null` mientras se comprueba. Una petición directa en lugar del cliente
 * de Better Auth: la landing no carga ese bundle sólo para esto y sigue
 * siendo estática.
 */
export function useHasSession() {
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/get-session", { signal: controller.signal, cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => setHasSession(Boolean(body?.session)))
      .catch(() => {
        if (!controller.signal.aborted) setHasSession(false);
      });
    return () => controller.abort();
  }, []);

  return hasSession;
}
