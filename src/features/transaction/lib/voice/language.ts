const WORD_START = String.raw`(?<![\p{L}\d])`;
const WORD_END = String.raw`(?![\p{L}\d])`;

const SPOKEN_NUMBER = String.raw`\$?(\d{1,3}(?:[ .,]\d{3})+|\d+(?:[.,]\d{1,2})?)`;
const SLANG_THOUSANDS = "lucas?";

interface RelativeDate {
  pattern: RegExp;
  daysAgo: number;
  match: string;
}

interface VoiceVocabulary {
  currency: string;
  multiplier: string;
  multipliers: Record<string, number>;
  numberWords: Record<string, number>;
  cents: string;
  months: string[];
  days: string[];
  relativeDates: RelativeDate[];
  exactDate: RegExp;
  weekday: RegExp;
  incomeVerbs: string[];
  leadingVerbs: RegExp;
  connectors: RegExp;
  trailingConnectors: RegExp;
  synonyms: { words: string[]; categoryStems: string[] }[];
}

export interface VoiceLanguage extends VoiceVocabulary {
  amount: RegExp;
  numberWordAmount: RegExp;
  currencyWord: RegExp;
}

export const wordList = (list: string) => new RegExp(String.raw`${WORD_START}(?:${list})${WORD_END}`, "giu");

export function defineLanguage(vocabulary: VoiceVocabulary): VoiceLanguage {
  const { cents, multiplier, currency, numberWords } = vocabulary;
  return {
    ...vocabulary,
    amount: new RegExp(
      String.raw`${SPOKEN_NUMBER}(?:${cents})?\s*(?:(${multiplier}|${SLANG_THOUSANDS})${WORD_END})?\s*(${currency})?`,
      "giu",
    ),
    numberWordAmount: new RegExp(String.raw`\b(${Object.keys(numberWords).join("|")})\s+(${currency})`, "i"),
    currencyWord: new RegExp(String.raw`${WORD_START}${currency}${WORD_END}`, "giu"),
  };
}
