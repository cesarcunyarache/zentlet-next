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
