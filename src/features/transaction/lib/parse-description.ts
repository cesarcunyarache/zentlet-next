import type { CategoryLike, TransactionType } from "../types";

/*
 * Lectura instantánea del asunto mientras se escribe, sin red: "sueldo" →
 * ingreso; "taxi" → la categoría cuyo nombre aparezca. El monto nunca se
 * toma del texto: va sólo en su campo. La IA llega después y afina lo que
 * esto no alcanza (sinónimos, contexto).
 */

export interface DescriptionHints {
  type: TransactionType | null;
  categoryId: string | null;
}

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
    type: inferType(text),
    categoryId: matchCategory(text, categories),
  };
}
