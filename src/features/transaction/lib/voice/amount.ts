import { normalize } from "../parse-description";
import type { VoiceLanguage } from "./language";

export interface SpokenAmount {
  value: number;
  match: string;
}

interface AmountCandidate extends SpokenAmount {
  hasCurrency: boolean;
}

const THOUSANDS_GROUPED = /^\d{1,3}(?:[ .,]\d{3})+$/;
const THOUSANDS_SEPARATORS = /[ .,]/g;
const CENTS_DIGITS = 2;

const roundToCents = (value: number) => Math.round(value * 100) / 100;

function parseNumberToken(token: string) {
  if (THOUSANDS_GROUPED.test(token)) return Number(token.replace(THOUSANDS_SEPARATORS, ""));
  return Number(token.replace(",", "."));
}

function toCandidate(found: RegExpMatchArray, lang: VoiceLanguage): AmountCandidate | null {
  const [match, raw, cents, multiplier, currency] = found;
  let value = parseNumberToken(raw);
  if (cents) value += Number(cents.padEnd(CENTS_DIGITS, "0")) / 100;
  if (multiplier) value *= lang.multipliers[normalize(multiplier)] ?? 1;
  if (!Number.isFinite(value) || value <= 0) return null;
  return { value, match: match.trim(), hasCurrency: Boolean(currency || multiplier || match.startsWith("$")) };
}

function findNumberWordAmount(text: string, lang: VoiceLanguage): SpokenAmount | null {
  const word = lang.numberWordAmount.exec(text);
  if (!word) return null;
  return { value: lang.numberWords[normalize(word[1])], match: word[0] };
}

export function findAmount(text: string, lang: VoiceLanguage): SpokenAmount | null {
  const candidates = Array.from(text.matchAll(lang.amount), (found) => toCandidate(found, lang)).filter(
    (candidate) => candidate !== null,
  );
  if (!candidates.length) return findNumberWordAmount(text, lang);

  const best = candidates.find((candidate) => candidate.hasCurrency) ?? candidates[candidates.length - 1];
  return { value: roundToCents(best.value), match: best.match };
}
