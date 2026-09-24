import { getMessages } from "next-intl/server";
import { intlLocales, type Locale } from "@/i18n/routing";
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

/*
 * Punto único de acceso al contenido de la landing: une el copy del idioma
 * (`src/locales/<locale>/landing.json`) con los datos de ./data.ts. Los
 * componentes reciben el resultado por props, así que siguen siendo
 * Server Components sin saber de i18n.
 */
export async function getLandingContent(locale: Locale): Promise<LandingContent> {
  const { landing: copy } = await getMessages({ locale });

  const category = (key: CategoryKey): DemoCategory => ({
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
          category: category(entry.category),
        })),
      },
    },
    showcase: {
      ...copy.showcase,
      dashboard: {
        ...copy.showcase.dashboard,
        totals: DASHBOARD.totals,
        categories: DASHBOARD.categories.map((item) => ({ ...category(item.category), total: item.total })),
      },
    },
    manifesto: copy.manifesto,
    features: {
      ...copy.features,
      items: FEATURES.map(({ id, key }) => ({ id, ...copy.features.items[key] })),
      samples: {
        phrases: copy.features.samples.phrases,
        suggestionFrom: copy.features.samples.suggestionFrom,
        suggestionCategory: category(FEATURE_SAMPLES.suggestionCategory),
        categoryIdeas: FEATURE_SAMPLES.categoryIdeas.map(category),
        currencies: FEATURE_SAMPLES.currencies.map(({ symbol, key }) => ({
          symbol,
          label: copy.features.samples.currencies[key],
        })),
      },
    },
    movements: MOVEMENTS.map((movement, index) => ({
      id: String(index + 1),
      ...copy.movements[movement.key],
      amount: movement.amount,
      type: movement.type,
      category: category(movement.category),
    })),
    steps: copy.steps,
    stats: {
      ...copy.stats,
      items: STATS.map(({ key, ...stat }) => ({ ...stat, label: copy.stats.items[key] })),
    },
    testimonials: { ...copy.testimonials, items: TESTIMONIALS },
    faq: copy.faq,
    cta: copy.cta,
    footer: copy.footer,
  };
}

export type * from "./types";
