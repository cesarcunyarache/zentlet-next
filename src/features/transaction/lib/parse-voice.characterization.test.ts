import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CategoryLike } from "../types";
import { parseVoiceEntry } from "./parse-voice";

const categories: CategoryLike[] = [
  { id: "food", name: "Comida" },
  { id: "transport", name: "Transporte" },
  { id: "health", name: "Salud" },
  { id: "salary", name: "Sueldo" },
  { id: "home", name: "Hogar y servicios" },
  { id: "fun", name: "Entretenimiento" },
  { id: "coffee", name: "Café" },
];

const SPANISH = [
  "",
  "   ",
  "gasté 1.500 soles en alquiler",
  "pagué 1 500 de alquiler",
  "gasté 1,234,567 en la casa",
  "me depositaron 2 millones",
  "compré una laptop por 3k",
  "gasté 20 lucas en el mercado",
  "5 lucas en pollo",
  "s/ 25 en farmacia",
  "S/. 30 de pasaje",
  "gasté 12.5 soles en café",
  "gasté 0 soles",
  "10.999 en algo",
  "me yapearon 50 soles",
  "me plinearon 20",
  "gané 300 en una venta",
  "hoy gasté 10 en pan",
  "el viernes pasado gasté 40 en cine",
  "el jueves pagué 10 de luz",
  "el 31 de febrero pagué 10",
  "el 15 de setiembre pagué 80 de internet",
  "el 5 de abril compré zapatillas por 120",
  "gasté veinte dólares en netflix",
  "gasté dos euros en un chicle",
  "gasté 45 soles en una cena muy larga con todos los amigos del trabajo y la familia",
  "compré en la bodega por 15 y",
  "antes de ayer puse 60 de gasolina",
  "registra 18 de uber",
  "anota 35 con 5 de almuerzo",
  "agrega 99,99 de spotify",
  "mi sueldo 4000",
  "cafe starbucks 14",
  "gym 120 mensual",
  "¿cuánto? 20 soles, ¡taxi!",
  "pagué 20 y luego 30 soles",
];

const ENGLISH = [
  "spent 1,500 on rent",
  "paid 2 million for a house",
  "spent 3k on a laptop",
  "sold my bike for 200",
  "got a refund of 30",
  "paid me 500 for the job",
  "earned 1200 freelance",
  "last friday spent 25 at the cinema",
  "on tuesday paid 9 for coffee",
  "may 5th paid 40 for books",
  "december 3rd paid 70 for a gift",
  "on the 31st of february paid 10",
  "spent twenty bucks on beer",
  "spent a dollar on gum",
  "spent 12.5 dollars on a burger",
  "log 18 for uber",
  "record 60 of gas",
  "today I bought groceries for 85",
  "put 45 on electricity",
  "I spent 45 dollars on a very long dinner with all my friends from work and family",
  "paid 20 and then 30 dollars",
];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 24, 12));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("parseVoiceEntry · salida completa (caracterización)", () => {
  it("en español", () => {
    expect(SPANISH.map((transcript) => [transcript, parseVoiceEntry(transcript, categories)])).toMatchSnapshot();
  });

  it("en inglés", () => {
    expect(ENGLISH.map((transcript) => [transcript, parseVoiceEntry(transcript, categories, "en")])).toMatchSnapshot();
  });
});
