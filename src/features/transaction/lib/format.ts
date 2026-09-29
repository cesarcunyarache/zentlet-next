import type { DateRange, Period, TTransaction } from "../types";

const NOON = 12;
const MS_PER_DAY = 86_400_000;
const DAYS_IN_WEEK = 7;
const THOUSAND = 1000;
const ONE_DECIMAL_BELOW = 100;
const MAX_INTEGER_DIGITS = 9;
const MAX_DECIMALS = 2;
const NUMBER_LOCALE = "es-PE";

const NON_AMOUNT_CHARS = /[^0-9.,]/g;
const COMMAS = /,/g;
const LEADING_ZEROS = /^0+(?=\d)/;

const SHORT_UNITS = [
  { size: 1e3, suffix: "k" },
  { size: 1e6, suffix: "M" },
  { size: 1e9, suffix: "B" },
];

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

export function periodRange(period: Period): DateRange {
  if (period === "all") return {};
  const now = today();
  const month = now.getMonth() - (period === "previous" ? 1 : 0);
  return {
    from: toISODate(new Date(now.getFullYear(), month, 1, NOON)),
    to: toISODate(new Date(now.getFullYear(), month + 1, 1, NOON)),
  };
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

export function formatNumber(value: number) {
  return Math.abs(value).toLocaleString(NUMBER_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatMoney(value: number, currency: string) {
  return `${currency} ${formatNumber(value)}`;
}

export function formatSigned(value: number, currency: string) {
  return `${value < 0 ? "−" : "+"} ${currency} ${formatNumber(value)}`;
}

export function formatShort(value: number) {
  const abs = Math.abs(value);
  if (Math.round(abs) < THOUSAND) return String(Math.round(abs));

  for (const [index, { size, suffix }] of SHORT_UNITS.entries()) {
    const scaled = abs / size;
    const rounded = Number(scaled.toFixed(scaled < ONE_DECIMAL_BELOW ? 1 : 0));
    const isLastUnit = index === SHORT_UNITS.length - 1;
    if (rounded < THOUSAND || isLastUnit) return `${rounded}${suffix}`;
  }
  return String(abs);
}

export function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function describeOrFallback(description: string, categoryName: string | undefined, defaultDescription: string) {
  return description || categoryName || defaultDescription;
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

export function signedAmount(tx: TTransaction) {
  return tx.type === "expense" ? -tx.amount : tx.amount;
}

function keepSingleSeparator(value: string) {
  const [int, ...decimals] = value.split(".");
  if (!decimals.length) return value;
  return `${int}.${decimals.join("").slice(0, MAX_DECIMALS)}`;
}

function limitIntegerDigits(value: string) {
  const [int, dec] = value.split(".");
  if (int.length <= MAX_INTEGER_DIGITS) return value;
  return int.slice(0, MAX_INTEGER_DIGITS) + (dec !== undefined ? `.${dec}` : "");
}

export function cleanAmountInput(raw: string) {
  const value = raw.replace(NON_AMOUNT_CHARS, "").replace(COMMAS, ".");
  return limitIntegerDigits(keepSingleSeparator(value).replace(LEADING_ZEROS, ""));
}

export function displayAmount(raw: string) {
  if (!raw) return "";
  const [int, dec] = raw.split(".");
  const grouped = Number(int || 0).toLocaleString(NUMBER_LOCALE);
  return dec !== undefined ? `${grouped}.${dec}` : grouped;
}

export function parseAmount(value: string) {
  return Math.round((Number.parseFloat(value || "0") || 0) * 100) / 100;
}
