import type { Locale } from "@/i18n/routing";
import type { ReceiptExtraction } from "../../ai/schemas/receipt-ai.schema";
import type { CategoryLike, TransactionType } from "../../types";
import { fold, matchCategory } from "../parse-description";
import { LANGUAGES, matchBySynonym } from "../parse-voice";

export interface LocalReading {
  extraction: ReceiptExtraction;
  isConfident: boolean;
}

type ReceiptApp = "Yape" | "Plin" | null;

interface Money {
  value: number;
  currency: string | null;
  line: number;
}

const MONEY =
  /(?<![\w:/.,-])(s\/\.?|5\/\.?|us\$|\$|pen|usd)?\s?(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?![\d:/%]|[.,]\d)/g;
const TOTAL_LINE = /\btotal\b/;
const AMOUNT_LINE = /\b(?:importe|monto|amount)\b/;
const NOT_TOTAL_LINE = /sub\s*-?\s*total|op\.?\s*grav|gravad|exonerad|inafect|total\s+(?:igv|dscto|descuento|items?|art)/;
const CASH_LINE = /efectivo|vuelto|cambio|pago con|recibido/;
const YAPE = /yape/;
const PLIN = /plin/;
const TRANSFER = /transferencia|constancia de (?:pago|operacion)/;
const INCOME = /te yape|te plin|recibiste|te (?:envi|transfiri|deposit)|abono|transferencia recibida|me yapearon/;
const BOLETA = /boleta/;
const FACTURA = /factura/;
const NAME_LINE = /^[a-zñáéíóúü][a-zñáéíóúü .']{2,39}$/i;
const APP_NOISE = /yape|plin|operaci|celular|destino|fecha|datos|compartir|comprobante|codigo|seguridad|s\/|bcp|interbank|bbva|scotiabank|enviar|pagar|inicio/;
const MERCHANT_NOISE =
  /boleta|factura|ticket|r\.?\s?u\.?\s?c|electr|venta|fecha|direcc|\bav\b|\bav\.|\bjr\b|\bjr\.|calle|telf|tel[eé]fono|cajero|cliente|sucursal|www|http|@|niubiz|visanet|izipay|culqi|mercado ?pago|openpay|vendemas/;
const LEGAL_SUFFIX = /\s+(?:s\.?\s?a\.?\s?c\.?|s\.?\s?a\.?\s?a\.?|s\.?\s?a\.?|e\.?\s?i\.?\s?r\.?\s?l\.?|s\.?\s?r\.?\s?l\.?)$/i;
const MERCHANT_LINES = 6;
const MIN_LETTER_RATIO = 0.6;
const DESCRIPTION_MAX = 40;

const MONTHS: Record<string, number> = {
  ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7,
  ago: 8, aug: 8, set: 9, sep: 9, oct: 10, nov: 11, dic: 12, dec: 12,
};
const NUMERIC_DATE = /(?<!\d)(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4}|\d{2})(?!\d)/;
const ISO_DATE = /(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/;
const NAMED_DATE = /(?<!\d)(\d{1,2})\s+(?:de\s+)?([a-z]{3})[a-z]*\.?\s+(?:de\s+|del\s+)?(\d{4})(?!\d)/;

function parseNumber(token: string) {
  const lastSeparator = Math.max(token.lastIndexOf("."), token.lastIndexOf(","));
  if (lastSeparator === -1) return Number(token);
  const decimals = token.length - lastSeparator - 1;
  if (decimals === 3) return Number(token.replace(/[.,]/g, ""));
  const integer = token.slice(0, lastSeparator).replace(/[.,]/g, "");
  return Number(`${integer}.${token.slice(lastSeparator + 1)}`);
}

function toCurrency(marker: string | undefined) {
  if (!marker) return null;
  return marker.includes("$") || marker === "usd" ? "USD" : "PEN";
}

function findMoney(lines: string[]): Money[] {
  return lines.flatMap((line, index) =>
    Array.from(line.matchAll(MONEY), ([, marker, token]) => ({
      value: parseNumber(token),
      currency: toCurrency(marker),
      line: index,
    })).filter(({ value }) => Number.isFinite(value) && value > 0),
  );
}

function lastOnLine(money: Money[], index: number) {
  return money.filter((item) => item.line === index).at(-1) ?? null;
}

function keywordAmount(lines: string[], money: Money[], keyword: RegExp, allowNextLine: boolean) {
  for (let index = lines.length - 1; index >= 0; index--) {
    if (!keyword.test(lines[index]) || NOT_TOTAL_LINE.test(lines[index])) continue;
    const found = lastOnLine(money, index) ?? (allowNextLine ? lastOnLine(money, index + 1) : null);
    if (found) return found;
  }
  return null;
}

function totalAmount(lines: string[], money: Money[]) {
  return keywordAmount(lines, money, TOTAL_LINE, true) ?? keywordAmount(lines, money, AMOUNT_LINE, false);
}

function largestMarkedAmount(lines: string[], money: Money[]) {
  return money
    .filter((item) => item.currency && !CASH_LINE.test(lines[item.line]))
    .reduce<Money | null>((best, item) => (!best || item.value > best.value ? item : best), null);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function validDate(year: number, month: number, day: number) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

function findDate(text: string) {
  const iso = ISO_DATE.exec(text);
  if (iso) return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const numeric = NUMERIC_DATE.exec(text);
  if (numeric) {
    const year = numeric[3].length === 2 ? 2000 + Number(numeric[3]) : Number(numeric[3]);
    return validDate(year, Number(numeric[2]), Number(numeric[1]));
  }
  const named = NAMED_DATE.exec(text);
  if (named && MONTHS[named[2]]) return validDate(Number(named[3]), MONTHS[named[2]], Number(named[1]));
  return null;
}

function titleCase(text: string) {
  return text.toLowerCase().replace(/(^|\s)\p{L}/gu, (letter) => letter.toUpperCase());
}

function letterRatio(line: string) {
  const letters = line.match(/\p{L}/gu)?.length ?? 0;
  return letters / Math.max(line.replace(/\s/g, "").length, 1);
}

function findMerchant(rawLines: string[], lines: string[]) {
  const index = lines
    .slice(0, MERCHANT_LINES)
    .findIndex((line) => line.length >= 4 && letterRatio(line) >= MIN_LETTER_RATIO && !MERCHANT_NOISE.test(line));
  if (index === -1) return "";
  return titleCase(rawLines[index].replace(LEGAL_SUFFIX, "").replace(/[^\p{L}\d&.' -]/gu, "").trim());
}

function findPayee(rawLines: string[], lines: string[], amountLine: number | undefined) {
  const start = amountLine === undefined ? 0 : amountLine + 1;
  for (let index = start; index < rawLines.length; index++) {
    if (NAME_LINE.test(rawLines[index]) && !APP_NOISE.test(lines[index])) return rawLines[index].trim();
  }
  return "";
}

function detectApp(text: string): ReceiptApp {
  if (YAPE.test(text)) return "Yape";
  if (PLIN.test(text)) return "Plin";
  return null;
}

function documentLabel(text: string) {
  if (FACTURA.test(text)) return "Factura";
  if (BOLETA.test(text)) return "Boleta";
  return null;
}

function appDescription(app: string, payee: string, type: TransactionType) {
  if (!payee) return app;
  return `${app} ${type === "income" ? "de" : "a"} ${payee}`;
}

function describe(rawLines: string[], lines: string[], text: string, app: ReceiptApp, type: TransactionType, amount: Money | null) {
  if (app) {
    const description = appDescription(app, findPayee(rawLines, lines, amount?.line), type);
    return { description, summary: description };
  }
  if (TRANSFER.test(text)) return { description: "Transferencia", summary: "Transferencia" };
  const merchant = findMerchant(rawLines, lines);
  const label = documentLabel(text);
  return { description: merchant, summary: [label, merchant].filter(Boolean).join(" · ") };
}

function pickAmount(lines: string[], money: Money[], app: ReceiptApp) {
  const total = totalAmount(lines, money);
  if (total) return { amount: total, isConfident: true };
  if (app || TRANSFER.test(lines.join("\n"))) {
    const marked = money.find((item) => item.currency);
    return { amount: marked ?? null, isConfident: Boolean(marked) };
  }
  return { amount: largestMarkedAmount(lines, money), isConfident: false };
}

export function readReceiptText(raw: string, categories: CategoryLike[], locale: Locale): LocalReading {
  const rawLines = raw.split("\n").map((line) => line.trim()).filter(Boolean);
  const lines = rawLines.map(fold);
  const text = lines.join("\n");
  const app = detectApp(text);
  const type: TransactionType = INCOME.test(text) ? "income" : "expense";
  const money = findMoney(lines);
  const { amount, isConfident } = pickAmount(lines, money, app);
  const { description, summary } = describe(rawLines, lines, text, app, type, amount);
  const shortDescription = description.slice(0, DESCRIPTION_MAX).trim();
  const categoryId = shortDescription
    ? (matchCategory(shortDescription, categories) ?? matchBySynonym(shortDescription, categories, LANGUAGES[locale]))
    : null;

  return {
    isConfident,
    extraction: {
      isReceipt: Boolean(amount || app || documentLabel(text)),
      amount: amount ? Math.round(amount.value * 100) / 100 : null,
      currency: amount?.currency ?? null,
      date: findDate(text),
      summary,
      description: shortDescription,
      categoryId,
      type,
    },
  };
}
