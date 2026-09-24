import type { DateRange, Period, TTransaction } from "../types";

/** Nombres en español que reconoce el dictado (parse-voice); no son texto de UI. */
export const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export const DAYS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

/** Mediodía para que los saltos de huso no muevan el día. */
export function today() {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d;
}

export function dayShift(days: number) {
  const d = today();
  d.setDate(d.getDate() - days);
  return d;
}

/** Rango `[from, to)` de un periodo en fechas locales; "Todo" no tiene límites. */
export function periodRange(period: Period): DateRange {
  if (period === "all") return {};
  const now = today();
  const month = now.getMonth() - (period === "previous" ? 1 : 0);
  return {
    from: toISODate(new Date(now.getFullYear(), month, 1, 12)),
    to: toISODate(new Date(now.getFullYear(), month + 1, 1, 12)),
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
  return new Date(y, m - 1, d, 12);
}

export function formatNumber(value: number) {
  return Math.abs(value).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatMoney(value: number, currency: string) {
  return `${currency} ${formatNumber(value)}`;
}

/** `− S/ 18.00` / `+ S/ 2800.00` — el signo va separado, se lee mejor. */
export function formatSigned(value: number, currency: string) {
  return `${value < 0 ? "−" : "+"} ${currency} ${formatNumber(value)}`;
}

const SHORT_UNITS = [
  { size: 1e3, suffix: "k" },
  { size: 1e6, suffix: "M" },
  { size: 1e9, suffix: "B" },
];

/**
 * Abreviado para las barras del gráfico, sin signo: 219 / 1k / 4.5k /
 * 12.3k / 250k / 1M. Un decimal sólo si la cifra tiene menos de 3 dígitos.
 */
export function formatShort(value: number) {
  const abs = Math.abs(value);
  if (Math.round(abs) < 1000) return String(Math.round(abs));

  for (const [index, { size, suffix }] of SHORT_UNITS.entries()) {
    const scaled = abs / size;
    const rounded = Number(scaled.toFixed(scaled < 100 ? 1 : 0));
    // 999.96k redondea a 1000k: pasa a la unidad siguiente (1M)
    if (rounded < 1000 || index === SHORT_UNITS.length - 1) {
      return `${rounded}${suffix}`;
    }
  }
  return String(abs);
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Hoy", "Ayer", "Lunes" o "12 de septiembre", en el idioma de la página. */
export function dayLabel(isoDate: string, locale: string) {
  const d = parseISODate(isoDate);
  const diff = Math.round((today().getTime() - d.getTime()) / 86400000);

  if (diff === 0 || diff === 1) {
    return capitalize(new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(-diff, "day"));
  }
  if (diff > 0 && diff < 7) {
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

/** Monto con signo aplicado: lo que suma o resta al balance. */
export function signedAmount(tx: TTransaction) {
  return tx.type === "expense" ? -tx.amount : tx.amount;
}

/**
 * Sanea lo que se teclea en el campo de monto: dígitos, un solo separador
 * decimal y como mucho dos decimales. Se escribe con el teclado normal.
 */
export function cleanAmountInput(raw: string) {
  let value = raw.replace(/[^0-9.,]/g, "").replace(/,/g, ".");

  const parts = value.split(".");
  if (parts.length > 1) {
    value = `${parts.shift()}.${parts.join("").slice(0, 2)}`;
  }

  value = value.replace(/^0+(?=\d)/, "");

  const [int, dec] = value.split(".");
  if (int.length > 9) {
    value = int.slice(0, 9) + (dec !== undefined ? `.${dec}` : "");
  }

  return value;
}

export function parseAmount(value: string) {
  return Math.round((Number.parseFloat(value || "0") || 0) * 100) / 100;
}
