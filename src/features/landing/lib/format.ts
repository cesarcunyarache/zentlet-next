import type { SectionId } from "../content";

/** Monto con dos decimales según el idioma de la página. */
export function formatAmount(value: number, locale: string) {
  return Math.abs(value).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** `− S/ 12.50` / `+ S/ 3,000.00`: el signo separado se lee mejor. */
export function formatSigned(value: number, type: "expense" | "income", currency: string, locale: string) {
  return `${type === "expense" ? "−" : "+"} ${currency} ${formatAmount(value, locale)}`;
}

/** Versión intensa de un color pastel de categoría, para barras y gráficos. */
export function vivid(color: string) {
  return `oklch(from ${color} calc(l - 0.22) calc(c * 2.4) h)`;
}

export function sectionHref(section: SectionId) {
  return `#${section}`;
}
