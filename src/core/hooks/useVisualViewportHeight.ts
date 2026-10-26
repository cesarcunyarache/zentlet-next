"use client";

import { useEffect, useState } from "react";

export interface VisualViewportBox {
  height: number;
  /** Distancia del borde inferior visible al de la página: el teclado más el desplazamiento de iOS al enfocar. */
  bottomOffset: number;
}

const KEYBOARD_MIN_HEIGHT = 80;

export function isKeyboardOpen(box: VisualViewportBox | null) {
  return box !== null && box.bottomOffset > KEYBOARD_MIN_HEIGHT;
}

/**
 * Zona visible de la pantalla: en iOS se encoge cuando sale el teclado y se
 * desplaza al enfocar un campo, mientras que `dvh` sigue midiendo la pantalla entera.
 */
export function useVisualViewportHeight(enabled: boolean) {
  const [box, setBox] = useState<VisualViewportBox | null>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!enabled || !viewport) return;
    const update = () =>
      setBox({
        height: viewport.height,
        bottomOffset: Math.max(0, window.innerHeight - viewport.offsetTop - viewport.height),
      });
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, [enabled]);

  return enabled ? box : null;
}
