import { DESCRIPTION_MAX_LENGTH } from "../../schemas/transaction.schema";
import { capitalize } from "../format";
import { fold } from "../parse-description";
import type { VoiceLanguage } from "./language";

const PUNCTUATION = /[.,;:!?¿¡$]/g;
const WHITESPACE = /\s+/g;

export function stripSpan(text: string, span: string) {
  if (!span) return text;
  const index = fold(text).indexOf(fold(span));
  return index < 0 ? text : text.slice(0, index) + " " + text.slice(index + span.length);
}

function stripRepeatedly(text: string, pattern: RegExp) {
  let rest = text;
  while (pattern.test(rest)) rest = rest.replace(pattern, "");
  return rest;
}

export function buildDescription(text: string, lang: VoiceLanguage, amountMatch = "", dateMatch = "") {
  const rest = stripSpan(stripSpan(text, amountMatch), dateMatch)
    .replace(lang.leadingVerbs, " ")
    .replace(lang.currencyWord, " ")
    .replace(PUNCTUATION, " ")
    .replace(WHITESPACE, " ")
    .trim();

  const withoutConnectors = stripRepeatedly(stripRepeatedly(rest, lang.connectors), lang.trailingConnectors);
  return capitalize(withoutConnectors.slice(0, DESCRIPTION_MAX_LENGTH).trim());
}
