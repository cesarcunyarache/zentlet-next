"use client";

import { useEffect, type RefObject } from "react";

export function useDismissOnOutside(ref: RefObject<HTMLElement | null>, isOpen: boolean, dismiss: () => void) {
  useEffect(() => {
    if (!isOpen) return;
    const dismissOutside = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) dismiss();
    };
    const dismissOnEscape = (event: KeyboardEvent) => event.key === "Escape" && dismiss();
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [ref, isOpen, dismiss]);
}
