import { describe, expect, it } from "vitest";
import { withCurrentFirst } from "../icon-order";

const suggestions = [
  { icon: "🛒", color: "#FDECC8" },
  { icon: "🍽️", color: "#FBDDD5" },
];

describe("withCurrentFirst", () => {
  it("deja las sugerencias igual cuando no hay icono actual", () => {
    expect(withCurrentFirst(suggestions, null)).toEqual(suggestions);
  });

  it("pone primero un icono elegido a mano para que las sugerencias nuevas no lo reemplacen", () => {
    const custom = { icon: "🦄", color: "#D5F0DD" };
    expect(withCurrentFirst(suggestions, custom)).toEqual([custom, ...suggestions]);
  });

  it("deja una sola entrada, con el color actual, si el icono actual también se sugiere", () => {
    const current = { icon: "🛒", color: "#000000" };
    expect(withCurrentFirst(suggestions, current)).toEqual([current, suggestions[1]]);
  });
});
