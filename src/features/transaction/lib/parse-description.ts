import type { CategoryLike, TransactionType } from "../types";

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
  "salary",
  "paycheck",
  "payroll",
  "income",
  "refund",
  "reimbursement",
  "bonus",
  "got paid",
];

const COMBINING_MARKS = /[̀-ͯ]/g;
const WORD_SEPARATOR = /[^a-z0-9ñ]+/;
const MIN_WORD_LENGTH = 3;
const STEM_LENGTH = 4;
const EXACT_MATCH_SCORE = 3;
const PARTIAL_MATCH_SCORE = 2;

export function fold(text: string) {
  return text.toLowerCase().normalize("NFD").replace(COMBINING_MARKS, "");
}

export function normalize(text: string) {
  return fold(text).trim();
}

export function inferType(text: string): TransactionType | null {
  const clean = normalize(text);
  return INCOME_WORDS.some((word) => clean.includes(word)) ? "income" : null;
}

function significantWords(normalized: string) {
  return normalized.split(WORD_SEPARATOR).filter((word) => word.length >= MIN_WORD_LENGTH);
}

function wordScore(word: string, name: string, nameWords: string[]) {
  if (name === word) return EXACT_MATCH_SCORE;
  const isPartial = nameWords.some(
    (nameWord) => nameWord.startsWith(word) || word.startsWith(nameWord.slice(0, STEM_LENGTH)),
  );
  return isPartial ? PARTIAL_MATCH_SCORE : 0;
}

function categoryScore(words: string[], category: CategoryLike) {
  const name = normalize(category.name);
  const nameWords = significantWords(name);
  return words.reduce((best, word) => Math.max(best, wordScore(word, name, nameWords)), 0);
}

export function matchCategory(text: string, categories: CategoryLike[]): string | null {
  const words = significantWords(normalize(text));
  if (!words.length) return null;

  let best: { id: string; score: number } | null = null;
  for (const category of categories) {
    const score = categoryScore(words, category);
    if (score > (best?.score ?? 0)) best = { id: category.id, score };
  }
  return best?.id ?? null;
}

export function readDescription(text: string, categories: CategoryLike[]): DescriptionHints {
  return {
    type: inferType(text),
    categoryId: matchCategory(text, categories),
  };
}
