"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_DURATION_MS = 1900;

export function useToast(duration = DEFAULT_DURATION_MS) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const show = useCallback(
    (next: string) => {
      setMessage(next);
      clearTimer();
      timer.current = setTimeout(() => setMessage(null), duration);
    },
    [duration, clearTimer],
  );

  useEffect(() => clearTimer, [clearTimer]);

  return { message, show };
}
