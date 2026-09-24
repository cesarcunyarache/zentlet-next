import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CategoryLike } from "../types";
import { readDescription } from "./parse-description";
import { parseVoiceEntry } from "./parse-voice";

const categories: CategoryLike[] = [
  { id: "food", name: "Food" },
  { id: "transport", name: "Transport" },
  { id: "health", name: "Salud" }, // nombrada en español: los sinónimos en inglés también la encuentran
  { id: "salary", name: "Salary" },
];

const parse = (transcript: string) => parseVoiceEntry(transcript, categories, "en");

// jueves 24 de septiembre de 2026, mediodía local
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 24, 12));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("parseVoiceEntry en inglés · monto", () => {
  it.each([
    ["spent 35 dollars on lunch", 35],
    ["taxi 12.50", 12.5],
    ["$20 for coffee", 20],
    ["rent 2,500", 2500],
    ["got paid 3 grand salary", 3000],
    ["lunch 35 and 50 cents", 35.5],
    ["spent fifty dollars at the market", 50],
  ])("«%s» → %d", (transcript, amount) => {
    expect(parse(transcript).amount).toBe(amount);
  });
});

describe("parseVoiceEntry en inglés · fecha", () => {
  it.each([
    ["taxi 10", "2026-09-24"],
    ["yesterday I spent 20 on lunch", "2026-09-23"],
    ["day before yesterday paid 15 for a taxi", "2026-09-22"],
    ["on monday spent 8 on coffee", "2026-09-21"],
    ["september 5th bought clothes for 90", "2026-09-05"],
    ["on the 5th of september bought clothes for 90", "2026-09-05"],
  ])("«%s» → %s", (transcript, date) => {
    expect(parse(transcript).transactionDate).toBe(date);
  });
});

describe("parseVoiceEntry en inglés · tipo, categoría y descripción", () => {
  it("un gasto queda limpio y en su categoría", () => {
    expect(parse("yesterday I spent 35 dollars on lunch")).toMatchObject({
      type: "expense",
      categoryId: "food",
    });
    expect(parse("spent 35 dollars on lunch").description).toBe("Lunch");
    expect(parse("yesterday I spent 35 dollars on lunch").description).toBe("Lunch");
    expect(parse("I paid 12.50 for a taxi").description).toBe("Taxi");
  });

  it("reconoce ingresos", () => {
    expect(parse("got paid 3 grand salary")).toMatchObject({ type: "income", categoryId: "salary" });
    expect(parse("received 200 from a client").type).toBe("income");
  });

  it("los sinónimos encuentran categorías nombradas en cualquiera de los dos idiomas", () => {
    expect(parse("uber 18 dollars").categoryId).toBe("transport");
    expect(parse("pharmacy 25").categoryId).toBe("health");
  });

  it("el español sigue siendo el idioma por defecto", () => {
    expect(parseVoiceEntry("ayer gasté 20 en almuerzo", categories).transactionDate).toBe("2026-09-23");
  });
});

describe("readDescription en inglés", () => {
  it("detecta ingresos al escribir", () => {
    expect(readDescription("September paycheck", categories).type).toBe("income");
    expect(readDescription("Uber to work", categories).type).toBeNull();
  });
});
