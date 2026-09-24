import type { Messages } from "next-intl";
import type { FeatureId, SectionId, Testimonial } from "./types";

/*
 * Datos de la landing que no dependen del idioma: montos de la demo,
 * colores, emojis, anclas y orden de las secciones. El texto vive en
 * `src/locales/<locale>/landing.json` y se une a esto en ./index.ts.
 */

type Copy = Messages["landing"];
export type CategoryKey = keyof Copy["categories"];

/** Moneda de la demo: el producto nace en Perú, se muestra igual en todos los idiomas. */
export const DEMO_CURRENCY = "S/";

export const CATEGORY_STYLES = {
  transport: { icon: "🚕", color: "oklch(0.92 0.05 230)" },
  market: { icon: "🛒", color: "oklch(0.93 0.06 75)" },
  home: { icon: "🏠", color: "oklch(0.92 0.05 300)" },
  salary: { icon: "💼", color: "oklch(0.93 0.06 150)" },
  food: { icon: "🍜", color: "oklch(0.93 0.05 30)" },
  coffee: { icon: "☕", color: "oklch(0.91 0.04 60)" },
  health: { icon: "💊", color: "oklch(0.93 0.05 180)" },
  fun: { icon: "🎬", color: "oklch(0.92 0.05 330)" },
} satisfies Record<CategoryKey, { icon: string; color: string }>;

/** Anclas: son identificadores de la página, no se traducen. */
export const NAV_SECTIONS: { key: keyof Copy["nav"]["links"]; section: SectionId }[] = [
  { key: "product", section: "producto" },
  { key: "features", section: "funciones" },
  { key: "howItWorks", section: "como-funciona" },
  { key: "faq", section: "preguntas" },
];

export const HERO_ENTRIES: {
  key: keyof Copy["hero"]["demo"]["entries"];
  amount: number;
  type: "expense" | "income";
  category: CategoryKey;
}[] = [
  { key: "taxi", amount: 12.5, type: "expense", category: "transport" },
  { key: "salary", amount: 3000, type: "income", category: "salary" },
  { key: "market", amount: 84.3, type: "expense", category: "market" },
  { key: "coffee", amount: 9, type: "expense", category: "coffee" },
];

export const DASHBOARD = {
  totals: { balance: 1185.7, income: 3000, expense: 1814.3 },
  categories: [
    { category: "home", total: 650 },
    { category: "market", total: 412.8 },
    { category: "food", total: 298.5 },
    { category: "transport", total: 186 },
    { category: "fun", total: 142 },
    { category: "coffee", total: 125 },
  ] satisfies { category: CategoryKey; total: number }[],
};

export const FEATURES: { id: FeatureId; key: keyof Copy["features"]["items"] }[] = [
  { id: "natural-input", key: "naturalInput" },
  { id: "ai-category", key: "aiCategory" },
  { id: "live-feed", key: "liveFeed" },
  { id: "balance", key: "balance" },
  { id: "categories", key: "categories" },
  { id: "currency", key: "currency" },
];

export const FEATURE_SAMPLES = {
  suggestionCategory: "transport",
  categoryIdeas: ["food", "coffee", "health", "fun"],
  currencies: [
    { symbol: "S/", key: "sol" },
    { symbol: "$", key: "dollar" },
    { symbol: "€", key: "euro" },
  ],
} satisfies {
  suggestionCategory: CategoryKey;
  categoryIdeas: CategoryKey[];
  currencies: { symbol: string; key: keyof Copy["features"]["samples"]["currencies"] }[];
};

export const MOVEMENTS: {
  key: keyof Copy["movements"];
  amount: number;
  type: "expense" | "income";
  category: CategoryKey;
}[] = [
  { key: "payroll", amount: 3000, type: "income", category: "salary" },
  { key: "market", amount: 84.3, type: "expense", category: "market" },
  { key: "taxi", amount: 12.5, type: "expense", category: "transport" },
  { key: "rent", amount: 650, type: "expense", category: "home" },
  { key: "ramen", amount: 38, type: "expense", category: "food" },
  { key: "cinema", amount: 24, type: "expense", category: "fun" },
];

export const STATS: {
  key: keyof Copy["stats"]["items"];
  value: number;
  from?: number;
  prefix?: string;
  suffix?: string;
}[] = [
  { key: "speed", value: 3, prefix: "≈", suffix: " s" },
  { key: "iconIdeas", value: 4 },
  { key: "currencies", value: 3 },
  { key: "formulas", value: 0, from: 12 },
];

/**
 * Opiniones reales, en el idioma en que se escribieron. Con 1 o más se
 * muestra el carrusel; vacío, la invitación `testimonials.empty`.
 * { name: "Ana Torres", role: "Diseñadora, Lima", quote: "…", avatar: "/testimonials/ana.jpg" }
 */
export const TESTIMONIALS: Testimonial[] = [];
