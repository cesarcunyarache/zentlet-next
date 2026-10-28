import { describe, expect, it } from "vitest";
import { CURRENCY_CODES, DEFAULT_CURRENCY, currencySymbol, parseStoredCurrency } from "../currency";

describe("currencySymbol", () => {
  it.each([
    ["PEN", "S/"],
    ["USD", "$"],
    ["EUR", "€"],
    ["COP", "$COP"],
  ] as const)("%s se muestra como %s", (code, symbol) => {
    expect(currencySymbol(code)).toBe(symbol);
  });
});

describe("parseStoredCurrency", () => {
  it("lee el código guardado", () => {
    expect(parseStoredCurrency("EUR")).toBe("EUR");
  });

  it.each([
    ["S/", "PEN"],
    ["$", "USD"],
    ["€", "EUR"],
    ["$COP", "COP"],
  ])("convierte el símbolo antiguo %s a %s", (symbol, code) => {
    expect(parseStoredCurrency(symbol)).toBe(code);
  });

  it("sin valor o con uno desconocido usa la moneda por defecto", () => {
    expect(parseStoredCurrency(null)).toBe(DEFAULT_CURRENCY);
    expect(parseStoredCurrency("BTC")).toBe(DEFAULT_CURRENCY);
  });
});

it("los códigos son ISO 4217 y únicos", () => {
  expect(new Set(CURRENCY_CODES).size).toBe(CURRENCY_CODES.length);
  for (const code of CURRENCY_CODES) expect(code).toMatch(/^[A-Z]{3}$/);
});
