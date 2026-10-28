import { DESCRIPTION_MAX_LENGTH } from "@/features/transaction/schemas/transaction.schema";
import type { EmailMovement } from "../types";
import { findEmailDate } from "./email-date";
import { findMoney } from "./money";

const AMOUNT_LABEL =
  /^(?:total del consumo|total de la operaci[oó]n|monto total|monto de la operaci[oó]n|monto transferido|monto pagado|importe total|monto|importe|total)\b/i;
const MERCHANT_LABEL =
  /^(?:empresa|nombre del comercio|comercio|establecimiento|beneficiario|destinatario|enviado a|pagado a)\b/i;
const DATE_LABEL = /^(?:fecha y hora|fecha de (?:la )?operaci[oó]n|fecha)\b/i;
const REFERENCE_LABEL = /^(?:n[uú]mero de operaci[oó]n|nro\.? de operaci[oó]n|c[oó]digo de operaci[oó]n)\b/i;
const OPERATION_LABEL = /^(?:operaci[oó]n realizada|tipo de operaci[oó]n)\b/i;
const INTRO =
  /(?:realizaste|hiciste|has realizado|se realiz[oó])\s+(?:un|una)\s+[a-záéíóú]+\s+(?:de|por)\s+(?:S\/\.?|US\$|\$)\s?[\d.,]+[^.\n]*?\s+en\s+([^\n]+?)\.(?:\s|$)/i;
const INCOME = /recibiste|te (?:transfiri|deposit|abon|yape|plin)|abono en tu|dep[oó]sito (?:a|en) tu|transferencia recibida/i;
const CARD = /\*{3,}\s?(\d{4})\b/;
const REFERENCE = /^[A-Z0-9-]{4,}$/i;

function labeled(lines: string[], label: RegExp) {
  for (let index = 0; index < lines.length; index++) {
    const match = label.exec(lines[index]);
    if (!match) continue;
    const rest = lines[index].slice(match[0].length).replace(/^[\s:\t-]+/, "").trim();
    return rest || lines[index + 1]?.trim() || null;
  }
  return null;
}

function cleanMerchant(value: string | null | undefined) {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  return trimmed === trimmed.toUpperCase() ? trimmed.toLowerCase().replace(/(^|\s)\p{L}/gu, (l) => l.toUpperCase()) : trimmed;
}

function findReference(lines: string[]) {
  const value = labeled(lines, REFERENCE_LABEL)?.split(/\s/)[0];
  return value && REFERENCE.test(value) ? value : null;
}

export function parseBankEmail(body: string, subject = ""): EmailMovement | null {
  const lines = body.split("\n");
  const labeledAmount = labeled(lines, AMOUNT_LABEL);
  const money = (labeledAmount && findMoney(labeledAmount)) || findMoney(body);
  if (!money) return null;

  const merchant = cleanMerchant(labeled(lines, MERCHANT_LABEL) ?? INTRO.exec(body)?.[1]);
  const operation = labeled(lines, OPERATION_LABEL);
  const description = (merchant ?? operation ?? subject).slice(0, DESCRIPTION_MAX_LENGTH).trim();

  return {
    type: INCOME.test(body) ? "income" : "expense",
    amount: money.value,
    currency: money.currency,
    merchant,
    description,
    transactionDate: findEmailDate(labeled(lines, DATE_LABEL) ?? body),
    cardLast4: CARD.exec(body)?.[1] ?? null,
    reference: findReference(lines),
  };
}
