"use client";

import { useEffect, useRef } from "react";
import { createLongPress } from "../lib/long-press";

type LongPress = ReturnType<typeof createLongPress>;

const PRIMARY_BUTTON = 0;

const pointOf = (event: React.PointerEvent) => ({ x: event.clientX, y: event.clientY });

export function useLongPress(onLongPress: () => void) {
  const onLongPressRef = useRef(onLongPress);
  const pressRef = useRef<LongPress | null>(null);

  useEffect(() => {
    onLongPressRef.current = onLongPress;
  });
  useEffect(() => () => pressRef.current?.end(), []);

  const press = () => (pressRef.current ??= createLongPress(() => onLongPressRef.current()));
  const end = () => press().end();

  return {
    consumeClick: () => press().consumeClick(),
    handlers: {
      onPointerDown: (event: React.PointerEvent) => {
        if (event.button === PRIMARY_BUTTON) press().start(pointOf(event));
      },
      onPointerMove: (event: React.PointerEvent) => press().move(pointOf(event)),
      onPointerUp: end,
      onPointerCancel: end,
      onPointerLeave: end,
      onContextMenu: (event: React.MouseEvent) => {
        event.preventDefault();
        press().trigger();
      },
    },
  };
}
