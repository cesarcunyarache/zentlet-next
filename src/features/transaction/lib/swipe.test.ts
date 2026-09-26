import { describe, expect, it } from "vitest";
import { SWIPE_REVEAL, swipeOffset, swipeSideOnRelease } from "./swipe";

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
    // editar abierto (+82), se arrastra hacia la izquierda rápido pero la fila sigue a la derecha
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
