export const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE = 10;

interface Point {
  x: number;
  y: number;
}

/**
 * Pulsación larga sin depender del DOM. `trigger` cubre el menú contextual:
 * el sistema también lo abre al mantener pulsado, y dentro de una misma
 * pulsación nunca dispara dos veces.
 */
export function createLongPress(onLongPress: () => void, delay = LONG_PRESS_MS) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let origin: Point = { x: 0, y: 0 };
  let pressing = false;
  let fired = false;

  function clearTimer() {
    clearTimeout(timer);
    timer = undefined;
  }

  function trigger() {
    clearTimer();
    if (!pressing) return onLongPress();
    if (fired) return;
    fired = true;
    onLongPress();
  }

  return {
    start(point: Point) {
      clearTimer();
      pressing = true;
      fired = false;
      origin = point;
      timer = setTimeout(trigger, delay);
    },
    move(point: Point) {
      if (Math.hypot(point.x - origin.x, point.y - origin.y) > MOVE_TOLERANCE) clearTimer();
    },
    end() {
      clearTimer();
      pressing = false;
    },
    trigger,
    /** `true` si el toque que llega ahora es el final de una pulsación larga. */
    consumeClick() {
      const wasLongPress = fired;
      fired = false;
      return wasLongPress;
    },
  };
}
