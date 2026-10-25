"use client";

import { useEffect, useState } from "react";

/**
 * Alto del viewport visible: en iOS baja cuando sale el teclado, mientras
 * que `dvh` sigue midiendo la pantalla entera.
 */
export function useVisualViewportHeight(enabled: boolean) {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!enabled || !viewport) return;
    const update = () => setHeight(viewport.height);
    update();
    viewport.addEventListener("resize", update);
    return () => viewport.removeEventListener("resize", update);
  }, [enabled]);

  return enabled ? height : null;
}
