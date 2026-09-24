import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CategoryLike } from "../types";
import { matchCategory, readDescription } from "./parse-description";
import { parseVoiceEntry } from "./parse-voice";

const categories: CategoryLike[] = [
  { id: "food", name: "Comida" },
  { id: "transport", name: "Transporte" },
  { id: "health", name: "Salud" },
  { id: "salary", name: "Sueldo" },
];

// jueves 24 de septiembre de 2026, mediodía local
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 24, 12));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("parseVoiceEntry · monto", () => {
  it.each([
    ["gasté 35 soles en almuerzo", 35],
    ["taxi 12.50", 12.5],
    ["taxi 12,50", 12.5],
    ["almuerzo 35 con 50", 35.5],
    ["alquiler 2.500 soles", 2500],
    ["me pagaron 3 mil de sueldo", 3000],
    ["gasté cien soles en el mercado", 100],
  ])("«%s» → %d", (transcript, amount) => {
    expect(parseVoiceEntry(transcript, categories).amount).toBe(amount);
  });

  it("sin cifra no inventa un monto", () => {
    expect(parseVoiceEntry("almuerzo con amigos", categories).amount).toBeNull();
  });
});

describe("parseVoiceEntry · fecha", () => {
  it.each([
    ["taxi 10", "2026-09-24"],
    ["ayer gasté 20 en almuerzo", "2026-09-23"],
    ["anteayer pagué 15 de taxi", "2026-09-22"],
    ["el lunes gasté 8 en café", "2026-09-21"],
    ["el 5 de septiembre compré ropa por 90", "2026-09-05"],
  ])("«%s» → %s", (transcript, date) => {
    expect(parseVoiceEntry(transcript, categories).transactionDate).toBe(date);
  });

  it("una fecha exacta en el futuro se entiende del año anterior", () => {
    expect(parseVoiceEntry("el 3 de diciembre pagué 40", categories).transactionDate).toBe("2025-12-03");
  });
});

describe("parseVoiceEntry · tipo, categoría y descripción", () => {
  it("un gasto dictado queda limpio y en su categoría", () => {
    expect(parseVoiceEntry("ayer gasté 35 soles en almuerzo", categories)).toMatchObject({
      type: "expense",
      description: "Almuerzo",
      categoryId: "food",
    });
  });

  it("reconoce ingresos por la palabra o el verbo", () => {
    expect(parseVoiceEntry("me pagaron 3 mil de sueldo", categories)).toMatchObject({ type: "income", categoryId: "salary" });
    expect(parseVoiceEntry("recibí 200 de un trabajo", categories).type).toBe("income");
  });

  it("usa sinónimos cuando el nombre de la categoría no aparece", () => {
    expect(parseVoiceEntry("uber 18 soles", categories).categoryId).toBe("transport");
    expect(parseVoiceEntry("farmacia 25", categories).categoryId).toBe("health");
  });

  it("sin pista suficiente deja la categoría vacía (la completa la IA o el usuario)", () => {
    expect(parseVoiceEntry("cosas varias 30", categories).categoryId).toBeNull();
  });
});

describe("readDescription", () => {
  it("detecta ingresos y categoría mientras se escribe", () => {
    expect(readDescription("sueldo de septiembre", categories)).toEqual({ type: "income", categoryId: "salary" });
    expect(readDescription("transporte al trabajo", categories)).toEqual({ type: null, categoryId: "transport" });
  });

  it("ignora tildes y mayúsculas", () => {
    expect(matchCategory("SALÚD", categories)).toBe("health");
  });

  it("palabras de menos de 3 letras no bastan", () => {
    expect(matchCategory("de a", categories)).toBeNull();
  });
});
