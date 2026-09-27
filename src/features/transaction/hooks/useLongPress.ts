"use client";

import { useEffect, useRef } from "react";
import { createLongPress } from "../lib/long-press";

type LongPress = ReturnType<typeof createLongPress>;

/** Handlers de pulsación larga para un elemento; `consumeClick` evita el toque que la cierra. */
export function useLongPress(onLongPress: () => void) {
  const callback = useRef(onLongPress);
  const pressRef = useRef<LongPress | null>(null);

  useEffect(() => {
    callback.current = onLongPress;
  });
  useEffect(() => () => pressRef.current?.end(), []);

  const press = () => (pressRef.current ??= createLongPress(() => callback.current()));

  return {
    consumeClick: () => press().consumeClick(),
    handlers: {
      onPointerDown: (event: React.PointerEvent) => {
        if (event.button === 0) press().start({ x: event.clientX, y: event.clientY });
      },
      onPointerMove: (event: React.PointerEvent) => press().move({ x: event.clientX, y: event.clientY }),
      onPointerUp: () => press().end(),
      onPointerCancel: () => press().end(),
      onPointerLeave: () => press().end(),
      onContextMenu: (event: React.MouseEvent) => {
        event.preventDefault();
        press().trigger();
      },
    },
  };
}
