interface ParsedMoney {
  value: number;
  currency: string | null;
}

const MONEY = /(S\/\.?|US\$|USD|PEN|\$)\s?(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?![\d])/i;

function parseNumber(token: string) {
  const lastSeparator = Math.max(token.lastIndexOf("."), token.lastIndexOf(","));
  if (lastSeparator === -1) return Number(token);
  const decimals = token.length - lastSeparator - 1;
  if (decimals === 3) return Number(token.replace(/[.,]/g, ""));
  return Number(`${token.slice(0, lastSeparator).replace(/[.,]/g, "")}.${token.slice(lastSeparator + 1)}`);
}

function toCurrency(marker: string) {
  const upper = marker.toUpperCase();
  return upper.includes("$") || upper === "USD" ? "USD" : "PEN";
}

export function findMoney(text: string): ParsedMoney | null {
  const found = MONEY.exec(text);
  if (!found) return null;
  const value = Math.round(parseNumber(found[2]) * 100) / 100;
  return Number.isFinite(value) && value > 0 ? { value, currency: toCurrency(found[1]) } : null;
}
