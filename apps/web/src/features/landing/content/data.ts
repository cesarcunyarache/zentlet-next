import type { Messages } from "next-intl";
import type { FeatureId, MovementType, SectionId, Testimonial } from "./types";

type Copy = Messages["landing"];
export type CategoryKey = keyof Copy["categories"];

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

export const NAV_SECTIONS: { key: keyof Copy["nav"]["links"]; section: SectionId }[] = [
  { key: "product", section: "producto" },
  { key: "features", section: "funciones" },
  { key: "howItWorks", section: "como-funciona" },
  { key: "pricing", section: "precios" },
  { key: "faq", section: "preguntas" },
];

interface SampleTransaction<Key> {
  key: Key;
  amount: number;
  type: MovementType;
  category: CategoryKey;
}

export const HERO_ENTRIES: SampleTransaction<keyof Copy["hero"]["demo"]["entries"]>[] = [
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
  { id: "voice", key: "voice" },
  { id: "receipt", key: "receipt" },
  { id: "budgets", key: "budgets" },
  { id: "recurring", key: "recurring" },
  { id: "live-feed", key: "liveFeed" },
  { id: "balance", key: "balance" },
  { id: "categories", key: "categories" },
  { id: "currency", key: "currency" },
];

type RecurringCopy = Copy["features"]["samples"]["recurring"];
type RecurringFrequency = Extract<keyof RecurringCopy, "monthly">;
type RecurringKey = Exclude<keyof RecurringCopy, RecurringFrequency>;

export const FEATURE_SAMPLES = {
  suggestionCategory: "transport",
  categoryIdeas: ["food", "coffee", "health", "fun"],
  budgets: [
    { category: "market", spent: 412.8, budget: 380 },
    { category: "food", spent: 298.5, budget: 400 },
    { category: "transport", spent: 186, budget: 250 },
  ],
  currencies: [
    { symbol: "S/", key: "sol" },
    { symbol: "$", key: "dollar" },
    { symbol: "€", key: "euro" },
  ],
  receipt: { lineAmounts: [32.9, 18.5, 32.9], category: "market" },
  recurring: [
    { key: "rent", amount: 650, type: "expense", category: "home", frequency: "monthly" },
    { key: "salary", amount: 3000, type: "income", category: "salary", frequency: "monthly" },
    { key: "streaming", amount: 44.9, type: "expense", category: "fun", frequency: "monthly" },
  ],
} satisfies {
  suggestionCategory: CategoryKey;
  categoryIdeas: CategoryKey[];
  budgets: { category: CategoryKey; spent: number; budget: number }[];
  currencies: { symbol: string; key: keyof Copy["features"]["samples"]["currencies"] }[];
  receipt: { lineAmounts: number[]; category: CategoryKey };
  recurring: (SampleTransaction<RecurringKey> & { frequency: RecurringFrequency })[];
};

export const MOVEMENTS: SampleTransaction<keyof Copy["movements"]>[] = [
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

export const TESTIMONIALS: Testimonial[] = [];
