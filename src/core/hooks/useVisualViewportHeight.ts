"use client";

import { useEffect, useState } from "react";

export interface VisualViewportBox {
  height: number;
  /** Cuánto ha desplazado iOS la vista al enfocar un campo. */
  offsetTop: number;
  /** El alto perdido respecto al mayor visto: el teclado. */
  keyboardHeight: number;
}

const KEYBOARD_MIN_HEIGHT = 80;

export function isKeyboardOpen(box: VisualViewportBox | null) {
  return box !== null && box.keyboardHeight > KEYBOARD_MIN_HEIGHT;
}

/**
 * Zona visible de la pantalla: en iOS se encoge cuando sale el teclado y se
 * desplaza al enfocar un campo, mientras que `dvh` sigue midiendo la pantalla
 * entera. `window.innerHeight` no sirve de referencia: en la PWA también encoge.
 */
export function useVisualViewportHeight(enabled: boolean) {
  const [box, setBox] = useState<VisualViewportBox | null>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!enabled || !viewport) return;
    let fullHeight = viewport.height;
    const update = () => {
      fullHeight = Math.max(fullHeight, viewport.height);
      setBox({ height: viewport.height, offsetTop: viewport.offsetTop, keyboardHeight: fullHeight - viewport.height });
    };
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
