import type { TTransaction } from "../types";

const MONTHS = [
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

const DAYS = [
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

/** Abreviado para las barras del gráfico: 1,2k / 12k / 219 */
export function formatShort(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1).replace(".", ",")}k`;
  }
  return String(Math.round(value));
}

export function dayLabel(isoDate: string) {
  const d = parseISODate(isoDate);
  const diff = Math.round((today().getTime() - d.getTime()) / 86400000);

  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  if (diff > 0 && diff < 7) {
    const name = DAYS[d.getDay()];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  return `${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

export function fullDate(isoDate: string) {
  const d = parseISODate(isoDate);
  return `${DAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
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
