export const CURRENCIES = [
  { code: "PEN", symbol: "S/", key: "sol" },
  { code: "USD", symbol: "$", key: "dollar" },
  { code: "EUR", symbol: "€", key: "euro" },
  { code: "COP", symbol: "$COP", key: "peso" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const CURRENCY_CODES = CURRENCIES.map(({ code }) => code) as [CurrencyCode, ...CurrencyCode[]];

export const DEFAULT_CURRENCY: CurrencyCode = "PEN";

export function currencySymbol(code: CurrencyCode) {
  return CURRENCIES.find((currency) => currency.code === code)?.symbol ?? code;
}

export function parseStoredCurrency(value: string | null): CurrencyCode {
  const match = CURRENCIES.find(({ code, symbol }) => value === code || value === symbol);
  return match?.code ?? DEFAULT_CURRENCY;
}
