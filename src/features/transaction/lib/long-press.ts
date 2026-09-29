export const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE = 10;

interface Point {
  x: number;
  y: number;
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function createLongPress(onLongPress: () => void, delay = LONG_PRESS_MS) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let origin: Point = { x: 0, y: 0 };
  let isPressing = false;
  let hasFired = false;

  function clearTimer() {
    clearTimeout(timer);
    timer = undefined;
  }

  function trigger() {
    clearTimer();
    if (!isPressing) return onLongPress();
    if (hasFired) return;
    hasFired = true;
    onLongPress();
  }

  return {
    start(point: Point) {
      clearTimer();
      isPressing = true;
      hasFired = false;
      origin = point;
      timer = setTimeout(trigger, delay);
    },
    move(point: Point) {
      if (distance(point, origin) > MOVE_TOLERANCE) clearTimer();
    },
    end() {
      clearTimer();
      isPressing = false;
    },
    trigger,
    consumeClick() {
      const wasLongPress = hasFired;
      hasFired = false;
      return wasLongPress;
    },
  };
}
