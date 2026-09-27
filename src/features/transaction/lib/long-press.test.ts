import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LONG_PRESS_MS, createLongPress } from "./long-press";

let onLongPress: ReturnType<typeof vi.fn<() => void>>;
let press: ReturnType<typeof createLongPress>;

beforeEach(() => {
  vi.useFakeTimers();
  onLongPress = vi.fn<() => void>();
  press = createLongPress(onLongPress);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createLongPress", () => {
  it("mantener pulsado dispara una vez y anula el toque que sigue", () => {
    press.start({ x: 0, y: 0 });
    vi.advanceTimersByTime(LONG_PRESS_MS);

    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(press.consumeClick()).toBe(true);
    expect(press.consumeClick()).toBe(false);
  });

  it("un toque corto es un toque normal", () => {
    press.start({ x: 0, y: 0 });
    vi.advanceTimersByTime(LONG_PRESS_MS - 1);
    press.end();
    vi.advanceTimersByTime(LONG_PRESS_MS);

    expect(onLongPress).not.toHaveBeenCalled();
    expect(press.consumeClick()).toBe(false);
  });

  it("deslizar para recorrer la tira cancela la pulsación", () => {
    press.start({ x: 0, y: 0 });
    press.move({ x: 24, y: 0 });
    vi.advanceTimersByTime(LONG_PRESS_MS);

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("el temblor natural del dedo no la cancela", () => {
    press.start({ x: 0, y: 0 });
    press.move({ x: 4, y: 3 });
    vi.advanceTimersByTime(LONG_PRESS_MS);

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it("el menú contextual (clic derecho, teclado o el propio sistema) dispara sin esperar", () => {
    press.trigger();

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it("si el sistema abre el menú contextual durante la pulsación no se dispara dos veces", () => {
    press.start({ x: 0, y: 0 });
    press.trigger();
    vi.advanceTimersByTime(LONG_PRESS_MS);

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it("el menú contextual sin pulsación dispara cada vez y no anula el siguiente toque", () => {
    press.trigger();
    press.trigger();

    expect(onLongPress).toHaveBeenCalledTimes(2);
    expect(press.consumeClick()).toBe(false);
  });

  it("una pulsación nueva vuelve a empezar", () => {
    press.start({ x: 0, y: 0 });
    vi.advanceTimersByTime(LONG_PRESS_MS);
    press.consumeClick();
    press.start({ x: 0, y: 0 });
    vi.advanceTimersByTime(LONG_PRESS_MS);

    expect(onLongPress).toHaveBeenCalledTimes(2);
  });
});
