"use client";

import { useEffect, useState } from "react";

export function useRotatingIndex(count: number, intervalMs: number, isPaused: boolean) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => setActiveIndex((value) => (value + 1) % count), intervalMs);
    return () => clearInterval(timer);
  }, [count, intervalMs, isPaused]);

  return activeIndex;
}
