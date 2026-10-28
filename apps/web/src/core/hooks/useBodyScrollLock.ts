"use client";

import { useEffect } from "react";

let activeLocks = 0;
let lockedScrollY = 0;

function lockBody() {
  activeLocks += 1;
  if (activeLocks > 1) return;
  lockedScrollY = window.scrollY;
  Object.assign(document.body.style, { position: "fixed", top: `-${lockedScrollY}px`, left: "0", right: "0" });
}

function unlockBody() {
  activeLocks -= 1;
  if (activeLocks > 0) return;
  Object.assign(document.body.style, { position: "", top: "", left: "", right: "" });
  window.scrollTo(0, lockedScrollY);
}

/**
 * Fija la página detrás de una hoja. `overflow: hidden` no basta en iOS y
 * vaul se salta su propio bloqueo en la PWA instalada.
 */
export function useBodyScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    lockBody();
    return unlockBody;
  }, [enabled]);
}
