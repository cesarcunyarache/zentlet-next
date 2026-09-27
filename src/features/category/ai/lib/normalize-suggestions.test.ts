import { describe, expect, it } from "vitest";
import { isSimpleEmoji, normalizeCategorySuggestions, sanitizeSuggestions, toPastel } from "./normalize-suggestions";

function hsl(hex: string) {
  const [r, g, b] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  return { l, s: (max - min) / (1 - Math.abs(2 * l - 1)) };
}

describe("isSimpleEmoji", () => {
  it("acepta un emoji simple, también con selector de variación", () => {
    expect(isSimpleEmoji("🍔")).toBe(true);
    expect(isSimpleEmoji("🏋️")).toBe(true);
  });

  it("rechaza texto, varios emojis y emojis compuestos", () => {
    expect(isSimpleEmoji("comida")).toBe(false);
    expect(isSimpleEmoji("🍔🍕")).toBe(false);
    expect(isSimpleEmoji("👨‍👩‍👧")).toBe(false);
    expect(isSimpleEmoji("👍🏽")).toBe(false);
    expect(isSimpleEmoji("🇵🇪")).toBe(false);
  });
});

describe("toPastel", () => {
  it("aclara un color saturado u oscuro dentro del rango pastel", () => {
    for (const color of ["#FF0000", "#1E3A8A", "#22C55E"]) {
      const pastel = toPastel(color);
      expect(pastel).toMatch(/^#[0-9A-F]{6}$/);
      const { l, s } = hsl(pastel as string);
      expect(l).toBeGreaterThanOrEqual(0.835);
      expect(l).toBeLessThanOrEqual(0.925);
      expect(s).toBeLessThanOrEqual(0.97);
    }
  });

  it("conserva el tono: un azul sigue siendo azul", () => {
    const [r, , b] = [1, 3, 5].map((at) => parseInt((toPastel("#1E3A8A") as string).slice(at, at + 2), 16));
    expect(b).toBeGreaterThan(r);
  });

  it("deja intactos los colores de los ejemplos del prompt", () => {
    for (const color of ["#FDDCC4", "#FCE8B2", "#CFF0D6", "#CFE3F7", "#F0DEC2", "#D0EFE6"]) {
      expect(toPastel(color)).toBe(color);
    }
  });

  it("descarta grises y valores que no son HEX", () => {
    expect(toPastel("#F5F5F5")).toBeNull();
    expect(toPastel("pastel pink")).toBeNull();
  });
});

describe("normalizeCategorySuggestions", () => {
  it("descarta opciones inválidas y repetidas y deja como mucho 4", () => {
    const result = normalizeCategorySuggestions({
      categories: [
        { icon: "🍔", color: "#FDDCC4" },
        { icon: "🍔", color: "#CFF0D6" },
        { icon: "comida", color: "#CFF0D6" },
        { icon: "🍕", color: "#EEEEEE" },
        { icon: "🥗", color: "#CFF0D6" },
        { icon: "🍜", color: "#F9D5DF" },
        { icon: "🌮", color: "#FCE8B2" },
        { icon: "🍣", color: "#CFE3F7" },
      ],
    });
    expect(result?.categories.map((c) => c.icon)).toEqual(["🍔", "🥗", "🍜", "🌮"]);
  });

  it("devuelve null si no queda ninguna opción", () => {
    expect(normalizeCategorySuggestions({ categories: [{ icon: "x", color: "#000000" }] })).toBeNull();
    expect(normalizeCategorySuggestions(null)).toBeNull();
  });
});

describe("sanitizeSuggestions", () => {
  it("sanea una lista suelta y devuelve null si queda vacía o no llega", () => {
    expect(sanitizeSuggestions([{ icon: "🐶", color: "#CFE3F7" }, { icon: "🐶", color: "#FDDCC4" }])).toEqual([
      { icon: "🐶", color: "#CFE3F7" },
    ]);
    expect(sanitizeSuggestions([{ icon: "perro", color: "#CFE3F7" }])).toBeNull();
    expect(sanitizeSuggestions(undefined)).toBeNull();
    expect(sanitizeSuggestions(null)).toBeNull();
  });
});
