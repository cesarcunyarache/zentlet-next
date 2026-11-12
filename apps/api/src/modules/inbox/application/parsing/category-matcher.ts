import type { MatchableCategory } from '../../domain/inbox-transaction/inbox-transaction.js';

// Self-contained port of the transaction module's deterministic keyword
// matcher (apps/web `features/transaction/lib/parse-description.ts`), kept
// local on purpose: this module never imports the transaction module.
const COMBINING_MARKS = /[̀-ͯ]/g;
const WORD_SEPARATOR = /[^a-z0-9ñ]+/;
const MIN_WORD_LENGTH = 3;
const STEM_LENGTH = 4;
const EXACT_MATCH_SCORE = 3;
const PARTIAL_MATCH_SCORE = 2;

export function fold(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(COMBINING_MARKS, '');
}

function normalize(text: string): string {
  return fold(text).trim();
}

function significantWords(normalized: string): string[] {
  return normalized.split(WORD_SEPARATOR).filter((word) => word.length >= MIN_WORD_LENGTH);
}

function wordScore(word: string, name: string, nameWords: string[]): number {
  if (name === word) return EXACT_MATCH_SCORE;
  const isPartial = nameWords.some((nameWord) => nameWord.startsWith(word) || word.startsWith(nameWord.slice(0, STEM_LENGTH)));
  return isPartial ? PARTIAL_MATCH_SCORE : 0;
}

function categoryScore(words: string[], category: MatchableCategory): number {
  const name = normalize(category.name);
  const nameWords = significantWords(name);
  return words.reduce((best, word) => Math.max(best, wordScore(word, name, nameWords)), 0);
}

export function matchCategory(text: string, categories: MatchableCategory[]): string | null {
  const words = significantWords(normalize(text));
  if (!words.length) return null;

  let best: { id: string; score: number } | null = null;
  for (const category of categories) {
    const score = categoryScore(words, category);
    if (score > (best?.score ?? 0)) best = { id: category.id, score };
  }
  return best?.id ?? null;
}
