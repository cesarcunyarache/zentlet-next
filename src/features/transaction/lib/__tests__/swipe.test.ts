import { describe, expect, it } from "vitest";
import { SWIPE_COMMIT, SWIPE_REVEAL, fullSwipeSide, swipeOffset, swipeSideOnRelease } from "../swipe";

const both = { canEdit: true, canDelete: true };

describe("swipeSideOnRelease", () => {
  it("pasada la mitad a la izquierda abre eliminar; a la derecha, editar", () => {
    expect(swipeSideOnRelease({ offset: -50, velocity: 0, ...both })).toBe("delete");
    expect(swipeSideOnRelease({ offset: 50, velocity: 0, ...both })).toBe("edit");
  });

  it("sin llegar a la mitad y sin gesto rápido vuelve a cerrarse", () => {
    expect(swipeSideOnRelease({ offset: -20, velocity: -100, ...both })).toBeNull();
    expect(swipeSideOnRelease({ offset: 20, velocity: 100, ...both })).toBeNull();
  });

  it("un gesto rápido basta para abrir en su dirección", () => {
    expect(swipeSideOnRelease({ offset: -10, velocity: -800, ...both })).toBe("delete");
    expect(swipeSideOnRelease({ offset: 10, velocity: 800, ...both })).toBe("edit");
  });

  it("un gesto rápido de vuelta desde un lado abierto lo cierra, no abre el contrario", () => {
    expect(swipeSideOnRelease({ offset: 30, velocity: -900, ...both })).toBeNull();
  });

  it("no abre un lado que no está disponible", () => {
    expect(swipeSideOnRelease({ offset: 60, velocity: 0, canEdit: false, canDelete: true })).toBeNull();
    expect(swipeSideOnRelease({ offset: -60, velocity: 0, canEdit: true, canDelete: false })).toBeNull();
  });
});

describe("swipeOffset", () => {
  it("editar desplaza a la derecha, eliminar a la izquierda, cerrado en 0", () => {
    expect(swipeOffset("edit")).toBe(SWIPE_REVEAL);
    expect(swipeOffset("delete")).toBe(-SWIPE_REVEAL);
    expect(swipeOffset(null)).toBe(0);
  });
});

describe("fullSwipeSide", () => {
  it("arrastrar más allá del umbral a la izquierda ejecuta eliminar; a la derecha, editar", () => {
    expect(fullSwipeSide({ offset: -SWIPE_COMMIT - 1, ...both })).toBe("delete");
    expect(fullSwipeSide({ offset: SWIPE_COMMIT + 1, ...both })).toBe("edit");
  });

  it("sin llegar al umbral solo se abre el botón, no se ejecuta nada", () => {
    expect(fullSwipeSide({ offset: -SWIPE_COMMIT, ...both })).toBeNull();
    expect(fullSwipeSide({ offset: SWIPE_REVEAL, ...both })).toBeNull();
    expect(fullSwipeSide({ offset: 0, ...both })).toBeNull();
  });

  it("no ejecuta un lado que no está disponible", () => {
    expect(fullSwipeSide({ offset: -SWIPE_COMMIT - 1, canEdit: true, canDelete: false })).toBeNull();
    expect(fullSwipeSide({ offset: SWIPE_COMMIT + 1, canEdit: false, canDelete: true })).toBeNull();
  });
});
