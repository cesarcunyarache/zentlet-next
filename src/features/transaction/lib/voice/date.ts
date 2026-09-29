import { dayShift, today, toISODate } from "@/lib/dates";
import { normalize } from "../parse-description";
import type { VoiceLanguage } from "./language";

export interface SpokenDate {
  isoDate: string;
  match: string;
}

const MONTH_ALIASES = new Map([["setiembre", "septiembre"]]);
const MAX_DAY = 31;
const DAYS_IN_WEEK = 7;
const NOON = 12;

function exactDate(day: number, monthName: string, lang: VoiceLanguage) {
  const month = lang.months.indexOf(MONTH_ALIASES.get(monthName) ?? monthName);
  if (month < 0 || day < 1 || day > MAX_DAY) return null;
  const now = today();
  const date = new Date(now.getFullYear(), month, day, NOON);
  if (date > now) date.setFullYear(date.getFullYear() - 1);
  if (date.getMonth() !== month) return null;
  return toISODate(date);
}

function findExactDate(clean: string, lang: VoiceLanguage): SpokenDate | null {
  const found = lang.exactDate.exec(clean);
  if (!found) return null;
  const [match, dayFirst, monthAfter, monthFirst, dayAfter] = found;
  const isoDate = exactDate(Number(dayFirst ?? dayAfter), monthAfter ?? monthFirst, lang);
  return isoDate ? { isoDate, match } : null;
}

function findRelativeDate(clean: string, lang: VoiceLanguage): SpokenDate | null {
  const relative = lang.relativeDates.find(({ pattern }) => pattern.test(clean));
  if (!relative) return null;
  return { isoDate: toISODate(dayShift(relative.daysAgo)), match: relative.match };
}

function findWeekday(clean: string, lang: VoiceLanguage): SpokenDate | null {
  const found = lang.weekday.exec(clean);
  if (!found) return null;
  const target = lang.days.indexOf(found[1]);
  const daysAgo = (today().getDay() - target + DAYS_IN_WEEK) % DAYS_IN_WEEK || DAYS_IN_WEEK;
  return { isoDate: toISODate(dayShift(daysAgo)), match: found[0] };
}

export function findDate(text: string, lang: VoiceLanguage): SpokenDate | null {
  const clean = normalize(text);
  return findExactDate(clean, lang) ?? findRelativeDate(clean, lang) ?? findWeekday(clean, lang);
}
