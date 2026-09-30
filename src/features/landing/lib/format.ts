import type { MovementType, SectionId } from "../content";

const AMOUNT_FORMAT: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

export function formatAmount(value: number, locale: string) {
  return Math.abs(value).toLocaleString(locale, AMOUNT_FORMAT);
}

export function amountSign(type: MovementType) {
  return type === "expense" ? "−" : "+";
}

export function formatSigned(value: number, type: MovementType, currency: string, locale: string) {
  return `${amountSign(type)} ${currency} ${formatAmount(value, locale)}`;
}

export function vivid(color: string) {
  return `oklch(from ${color} calc(l - 0.22) calc(c * 2.4) h)`;
}

export function sectionHref(section: SectionId) {
  return `#${section}`;
}

export function sectionTitleId(section: SectionId) {
  return `${section}-title`;
}

export function fillTemplate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (placeholder, key: string) =>
    key in values ? String(values[key]) : placeholder,
  );
}
