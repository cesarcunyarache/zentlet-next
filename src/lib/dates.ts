import { capitalize } from "./utils";

const NOON = 12;
const MS_PER_DAY = 86_400_000;
const DAYS_IN_WEEK = 7;

export function today() {
  const d = new Date();
  d.setHours(NOON, 0, 0, 0);
  return d;
}

export function dayShift(days: number) {
  const d = today();
  d.setDate(d.getDate() - days);
  return d;
}

export function toISODate(d: Date) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

export function parseISODate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, NOON);
}

export function dayLabel(isoDate: string, locale: string) {
  const d = parseISODate(isoDate);
  const daysAgo = Math.round((today().getTime() - d.getTime()) / MS_PER_DAY);

  if (daysAgo === 0 || daysAgo === 1) {
    return capitalize(new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(-daysAgo, "day"));
  }
  if (daysAgo > 0 && daysAgo < DAYS_IN_WEEK) {
    return capitalize(new Intl.DateTimeFormat(locale, { weekday: "long" }).format(d));
  }
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(d);
}

export function fullDate(isoDate: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseISODate(isoDate));
}

export function isoDateIn(timeZone: string, date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
