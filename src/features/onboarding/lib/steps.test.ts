import { describe, expect, it } from "vitest";
import {
  LAST_STEP_INDEX,
  ONBOARDING_STEPS,
  completionTarget,
  isValidStepIndex,
  keyboardIntent,
  swipeStepDelta,
} from "./steps";

const drag = (offsetX: number, velocityX = 0) => ({ offset: { x: offsetX }, velocity: { x: velocityX } });

describe("pasos del recorrido", () => {
  it("son cuatro, en este orden", () => {
    expect(ONBOARDING_STEPS).toEqual(["type", "voice", "budget", "month"]);
    expect(LAST_STEP_INDEX).toBe(3);
  });

  it("sólo existen los índices del primero al último", () => {
    expect(isValidStepIndex(-1)).toBe(false);
    expect(isValidStepIndex(0)).toBe(true);
    expect(isValidStepIndex(3)).toBe(true);
    expect(isValidStepIndex(4)).toBe(false);
  });
});

describe("keyboardIntent", () => {
  it("las flechas avanzan o retroceden y Escape omite", () => {
    expect(keyboardIntent("ArrowRight")).toBe("next");
    expect(keyboardIntent("ArrowLeft")).toBe("back");
    expect(keyboardIntent("Escape")).toBe("skip");
  });

  it("otras teclas no hacen nada", () => {
    expect(keyboardIntent("Enter")).toBeNull();
    expect(keyboardIntent("toString")).toBeNull();
  });
});

describe("swipeStepDelta", () => {
  it("deslizar a la izquierda más allá del umbral avanza", () => {
    expect(swipeStepDelta(drag(-61))).toBe(1);
    expect(swipeStepDelta(drag(-10, -401))).toBe(1);
  });

  it("deslizar a la derecha más allá del umbral retrocede", () => {
    expect(swipeStepDelta(drag(61))).toBe(-1);
    expect(swipeStepDelta(drag(10, 401))).toBe(-1);
  });

  it("un arrastre corto y lento no cambia de paso", () => {
    expect(swipeStepDelta(drag(-60, -400))).toBe(0);
    expect(swipeStepDelta(drag(60, 400))).toBe(0);
  });

  it("si distancia y velocidad se contradicen, gana avanzar", () => {
    expect(swipeStepDelta(drag(-80, 500))).toBe(1);
  });
});

describe("completionTarget", () => {
  it("terminar sin categorías lleva a crearlas", () => {
    expect(completionTarget(true, false)).toBe("categories");
  });

  it("omitir o tener ya categorías lleva a la app", () => {
    expect(completionTarget(true, true)).toBe("app");
    expect(completionTarget(false, false)).toBe("app");
  });
});
