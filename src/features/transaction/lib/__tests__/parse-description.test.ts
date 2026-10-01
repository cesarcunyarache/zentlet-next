import { describe, expect, it } from "vitest";
import { inferType, matchCategory, normalize, readDescription } from "./parse-description";

const categories = [
  { id: "food", name: "Comida" },
  { id: "transport", name: "Transporte" },
  { id: "health", name: "Salud" },
  { id: "home", name: "Servicios del hogar" },
];

describe("normalize", () => {
  it("quita mayúsculas, tildes y espacios de los bordes", () => {
    expect(normalize("  Devolución NÓMINA ")).toBe("devolucion nomina");
  });
});

describe("inferType", () => {
  it("reconoce ingresos en español e inglés, con o sin tildes", () => {
    expect(inferType("Sueldo de septiembre")).toBe("income");
    expect(inferType("Devolución de Amazon")).toBe("income");
    expect(inferType("me pagaron el freelance")).toBe("income");
    expect(inferType("Got paid")).toBe("income");
  });

  it("sin pista de ingreso no decide (no asume gasto)", () => {
    expect(inferType("taxi al aeropuerto")).toBeNull();
    expect(inferType("")).toBeNull();
  });
});

describe("matchCategory", () => {
  it("el nombre exacto de la categoría gana", () => {
    expect(matchCategory("salud mensual", categories)).toBe("health");
  });

  it("reconoce la raíz del nombre", () => {
    expect(matchCategory("transportes varios", categories)).toBe("transport");
    expect(matchCategory("comidas", categories)).toBe("food");
    expect(matchCategory("pago servicio de luz", categories)).toBe("home");
  });

  it("ignora tildes y mayúsculas del texto y del nombre", () => {
    expect(matchCategory("COMÍDA", [{ id: "food", name: "comida" }])).toBe("food");
  });

  it("un exacto gana a un parecido aunque este aparezca antes", () => {
    const similar = [
      { id: "trans", name: "Transferencias" },
      { id: "transporte", name: "Transporte" },
    ];
    expect(matchCategory("transporte", similar)).toBe("transporte");
  });

  it("palabras de menos de 3 letras o sin coincidencia no eligen nada", () => {
    expect(matchCategory("de la", categories)).toBeNull();
    expect(matchCategory("cine", categories)).toBeNull();
    expect(matchCategory("", categories)).toBeNull();
    expect(matchCategory("comida", [])).toBeNull();
  });
});

describe("readDescription", () => {
  it("combina tipo y categoría", () => {
    expect(readDescription("Reembolso de salud", categories)).toEqual({ type: "income", categoryId: "health" });
    expect(readDescription("xyz", categories)).toEqual({ type: null, categoryId: null });
  });
});
