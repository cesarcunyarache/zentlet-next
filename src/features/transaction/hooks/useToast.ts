"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useToast(duration = 1900) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (next: string) => {
      setMessage(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setMessage(null), duration);
    },
    [duration],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { message, show };
}
