"use client";

import { useEffect, useState } from "react";

const SESSION_ENDPOINT = "/api/auth/get-session";

export function useHasSession() {
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(SESSION_ENDPOINT, { signal: controller.signal, cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => setHasSession(Boolean(body?.session)))
      .catch(() => {
        if (!controller.signal.aborted) setHasSession(false);
      });
    return () => controller.abort();
  }, []);

  return hasSession;
}
