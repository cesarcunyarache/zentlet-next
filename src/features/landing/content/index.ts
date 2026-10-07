import { getMessages } from "next-intl/server";
import { intlLocales, type Locale } from "@/i18n/routing";
import { planPrice, TRIAL_DAYS } from "@/features/billing/lib/plans";
import { formatPrice } from "@/features/billing/lib/price";
import { fillTemplate } from "../lib/format";
import {
  CATEGORY_STYLES,
  DASHBOARD,
  DEMO_CURRENCY,
  FEATURES,
  FEATURE_SAMPLES,
  HERO_ENTRIES,
  MOVEMENTS,
  NAV_SECTIONS,
  STATS,
  TESTIMONIALS,
  type CategoryKey,
} from "./data";
import type { DemoCategory, LandingContent } from "./types";

export async function getLandingContent(locale: Locale): Promise<LandingContent> {
  const { landing: copy } = await getMessages({ locale });

  const proPrice = planPrice("pro");
  const pricingValues = {
    days: TRIAL_DAYS,
    price: formatPrice(proPrice.amount, proPrice.currency, intlLocales[locale]),
    period: copy.pricing.period,
  };
  const fill = (template: string) => fillTemplate(template, pricingValues);

  const toDemoCategory = (key: CategoryKey): DemoCategory => ({
    ...CATEGORY_STYLES[key],
    name: copy.categories[key],
  });

  return {
    locale: intlLocales[locale],
    meta: copy.meta,
    common: { ...copy.common, currency: DEMO_CURRENCY },
    nav: {
      ...copy.nav,
      links: NAV_SECTIONS.map(({ key, section }) => ({ label: copy.nav.links[key], section })),
    },
    hero: {
      ...copy.hero,
      demo: {
        ...copy.hero.demo,
        entries: HERO_ENTRIES.map((entry) => ({
          typed: copy.hero.demo.entries[entry.key],
          amount: entry.amount,
          type: entry.type,
          category: toDemoCategory(entry.category),
        })),
      },
    },
    showcase: {
      ...copy.showcase,
      dashboard: {
        ...copy.showcase.dashboard,
        totals: DASHBOARD.totals,
        categories: DASHBOARD.categories.map((item) => ({ ...toDemoCategory(item.category), total: item.total })),
      },
    },
    manifesto: copy.manifesto,
    features: {
      ...copy.features,
      items: FEATURES.map(({ id, key }) => ({ id, ...copy.features.items[key] })),
      samples: {
        phrases: copy.features.samples.phrases,
        suggestionFrom: copy.features.samples.suggestionFrom,
        suggestionCategory: toDemoCategory(FEATURE_SAMPLES.suggestionCategory),
        categoryIdeas: FEATURE_SAMPLES.categoryIdeas.map(toDemoCategory),
        budgets: FEATURE_SAMPLES.budgets.map(({ category, spent, budget }) => ({
          ...toDemoCategory(category),
          spent,
          budget,
        })),
        budgetLabels: copy.features.samples.budgetLabels,
        currencies: FEATURE_SAMPLES.currencies.map(({ symbol, key }) => ({
          symbol,
          label: copy.features.samples.currencies[key],
        })),
        voiceTranscript: copy.features.samples.voiceTranscript,
        receipt: {
          ...copy.features.samples.receipt,
          lines: copy.features.samples.receipt.lines.map((label, index) => ({
            label,
            amount: FEATURE_SAMPLES.receipt.lineAmounts[index] ?? 0,
          })),
          amount: FEATURE_SAMPLES.receipt.lineAmounts.reduce((sum, amount) => sum + amount, 0),
          category: toDemoCategory(FEATURE_SAMPLES.receipt.category),
        },
        recurring: FEATURE_SAMPLES.recurring.map(({ key, frequency, ...item }, index) => ({
          ...item,
          id: `recurring-${index + 1}`,
          description: copy.features.samples.recurring[key],
          when: copy.features.samples.recurring[frequency],
          category: toDemoCategory(item.category),
        })),
      },
    },
    movements: MOVEMENTS.map((movement, index) => ({
      id: String(index + 1),
      ...copy.movements[movement.key],
      amount: movement.amount,
      type: movement.type,
      category: toDemoCategory(movement.category),
    })),
    steps: copy.steps,
    stats: {
      ...copy.stats,
      items: STATS.map(({ key, ...stat }) => ({ ...stat, label: copy.stats.items[key] })),
    },
    testimonials: { ...copy.testimonials, items: TESTIMONIALS },
    pricing: {
      eyebrow: copy.pricing.eyebrow,
      title: copy.pricing.title,
      subtitle: fill(copy.pricing.subtitle),
      plans: [
        { id: "free", ...copy.pricing.free },
        {
          id: "pro",
          ...copy.pricing.pro,
          price: pricingValues.price,
          period: copy.pricing.period,
          badge: fill(copy.pricing.pro.badge),
          cta: fill(copy.pricing.pro.cta),
          note: fill(copy.pricing.pro.note),
        },
      ],
    },
    faq: {
      ...copy.faq,
      items: copy.faq.items.map((item) => ({ ...item, answer: fill(item.answer) })),
    },
    cta: copy.cta,
    footer: copy.footer,
  };
}

export type * from "./types";
