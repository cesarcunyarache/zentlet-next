const CENTS = 100;

export function formatPrice(amountInCents: number, currency: string, locale: string) {
  return (amountInCents / CENTS).toLocaleString(locale, { style: "currency", currency });
}
