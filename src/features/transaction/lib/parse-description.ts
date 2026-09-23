import type { CategoryLike, TransactionType } from "../types";

/*
 * Lectura instantánea del asunto mientras se escribe, sin red:
 * "Salario 3 millones" → ingreso de 3.000.000; "taxi 12.50" → gasto de
 * 12.5 en la categoría cuyo nombre aparezca. La IA llega después y afina
 * lo que esto no alcanza (sinónimos, contexto).
 */

export interface DescriptionHints {
  amount: number | null;
  type: TransactionType | null;
  categoryId: string | null;
}

const MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  mil: 1_000,
  lucas: 1_000,
  luca: 1_000,
  m: 1_000_000,
  millon: 1_000_000,
  millones: 1_000_000,
};

const INCOME_WORDS = [
  "salario",
  "sueldo",
  "nomina",
  "quincena",
  "ingreso",
  "cobro",
  "cobre",
  "venta",
  "vendi",
  "reembolso",
  "devolucion",
  "me pagaron",
  "me depositaron",
  "bono",
  "aguinaldo",
  "gratificacion",
  "freelance",
];

export function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** "3 millones", "20k", "12.50", "1,200.00", "s/ 45" → número o null. */
export function parseAmountFromText(text: string): number | null {
  const match = normalize(text).match(
    /(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(k|mil|lucas?|m|millon(?:es)?)?\b/,
  );
  if (!match) return null;

  let raw = match[1];
  // 1.200,50 / 1,200.50 → el último separador con 1-2 decimales es el decimal
  const decimal = raw.match(/[.,](\d{1,2})$/);
  if (decimal && raw.length - decimal[0].length > 0 && !/^\d{1,3}[.,]\d{3}$/.test(raw)) {
    raw = raw.slice(0, -decimal[0].length).replace(/[.,]/g, "") + "." + decimal[1];
  } else {
    raw = raw.replace(/[.,]/g, "");
  }

  const value = Number(raw) * (match[2] ? (MULTIPLIERS[match[2]] ?? 1) : 1);
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : null;
}

export function inferType(text: string): TransactionType | null {
  const clean = normalize(text);
  return INCOME_WORDS.some((word) => clean.includes(word)) ? "income" : null;
}

/** Categoría cuyo nombre (o su raíz) aparece en el texto. */
export function matchCategory(text: string, categories: CategoryLike[]): string | null {
  const words = normalize(text).split(/[^a-z0-9ñ]+/).filter((w) => w.length >= 3);
  if (!words.length) return null;

  let best: { id: string; score: number } | null = null;

  for (const category of categories) {
    const name = normalize(category.name);
    const nameWords = name.split(/[^a-z0-9ñ]+/).filter((w) => w.length >= 3);
    let score = 0;

    for (const word of words) {
      if (name === word) score = Math.max(score, 3);
      else if (nameWords.some((n) => n.startsWith(word) || word.startsWith(n.slice(0, 4))))
        score = Math.max(score, 2);
    }

    if (score > 0 && (!best || score > best.score)) best = { id: category.id, score };
  }

  return best?.id ?? null;
}

export function readDescription(text: string, categories: CategoryLike[]): DescriptionHints {
  return {
    amount: parseAmountFromText(text),
    type: inferType(text),
    categoryId: matchCategory(text, categories),
  };
}
