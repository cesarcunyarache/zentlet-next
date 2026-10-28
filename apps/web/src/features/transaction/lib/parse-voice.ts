import type { Locale } from "@/i18n/routing";
import type { CategoryLike, TransactionType } from "../types";
import { today, toISODate } from "@/lib/dates";
import { inferType, matchCategory, normalize } from "./parse-description";
import { findAmount } from "./voice/amount";
import { findDate } from "./voice/date";
import { buildDescription, stripSpan } from "./voice/description";
import { EN } from "./voice/en";
import { ES } from "./voice/es";
import type { VoiceLanguage } from "./voice/language";

export interface VoiceDraft {
  type: TransactionType;
  amount: number | null;
  description: string;
  categoryId: string | null;
  transactionDate: string;
}

export const LANGUAGES: Record<Locale, VoiceLanguage> = { es: ES, en: EN };

export function matchBySynonym(text: string, categories: CategoryLike[], lang: VoiceLanguage) {
  const clean = ` ${normalize(text)} `;
  const names = categories.map((category) => ({ id: category.id, name: normalize(category.name) }));
  for (const { words, categoryStems } of lang.synonyms) {
    if (!words.some((word) => clean.includes(` ${word} `))) continue;
    const category = names.find(({ name }) => categoryStems.some((stem) => name.includes(stem)));
    if (category) return category.id;
  }
  return null;
}

function inferVoiceType(text: string, lang: VoiceLanguage): TransactionType {
  const clean = normalize(text);
  const isIncome = inferType(clean) === "income" || lang.incomeVerbs.some((verb) => clean.includes(verb));
  return isIncome ? "income" : "expense";
}

export function parseVoiceEntry(transcript: string, categories: CategoryLike[], locale: Locale = "es"): VoiceDraft {
  const lang = LANGUAGES[locale];
  const text = transcript.trim();
  const date = findDate(text, lang);
  const amount = findAmount(date ? stripSpan(text, date.match) : text, lang);
  const description = buildDescription(text, lang, amount?.match, date?.match);

  return {
    type: inferVoiceType(text, lang),
    amount: amount?.value ?? null,
    description,
    categoryId: matchCategory(description, categories) ?? matchBySynonym(text, categories, lang),
    transactionDate: date?.isoDate ?? toISODate(today()),
  };
}
