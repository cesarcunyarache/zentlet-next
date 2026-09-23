import { BlurFade } from "@/core/components/ui/blur-fade";
import { MagicCard } from "@/core/components/ui/magic-card";
import { cn } from "@/lib/utils";
import type { FeatureId, LandingContent } from "../../content";
import { SectionHeading } from "../shared/section-heading";
import {
  AiCategoryVisual,
  BalanceVisual,
  CategoriesVisual,
  CurrencyVisual,
  LiveFeedVisual,
  NaturalInputVisual,
} from "./feature-visuals";

/** Lugar de cada tarjeta en la rejilla (3 columnas en escritorio). */
const LAYOUT: Record<FeatureId, string> = {
  "natural-input": "md:col-span-2",
  "ai-category": "",
  "live-feed": "md:row-span-2",
  balance: "",
  categories: "",
  currency: "md:col-span-2",
};

interface FeaturesSectionProps {
  features: LandingContent["features"];
  movements: LandingContent["movements"];
  common: LandingContent["common"];
  balance: number;
  locale: string;
}

export function FeaturesSection({ features, movements, common, balance, locale }: FeaturesSectionProps) {
  const { samples } = features;

  const visuals: Record<FeatureId, React.ReactNode> = {
    "natural-input": <NaturalInputVisual phrases={samples.phrases} />,
    "ai-category": <AiCategoryVisual from={samples.suggestionFrom} category={samples.suggestionCategory} />,
    "live-feed": <LiveFeedVisual movements={movements} currency={common.currency} locale={locale} />,
    balance: <BalanceVisual value={balance} currency={common.currency} locale={locale} />,
    categories: <CategoriesVisual ideas={samples.categoryIdeas} />,
    currency: <CurrencyVisual currencies={samples.currencies} />,
  };

  return (
    <section id="funciones" aria-labelledby="funciones-title" className="mx-auto max-w-6xl px-4 py-24 sm:px-6 md:py-32">
      <SectionHeading
        id="funciones-title"
        eyebrow={features.eyebrow}
        title={features.title}
        subtitle={features.subtitle}
      />

      <ul className="m-0 mt-16 grid list-none auto-rows-[minmax(22rem,auto)] grid-cols-1 gap-4 p-0 md:grid-cols-3">
        {features.items.map((item, index) => (
          <li key={item.id} className={cn("min-w-0", LAYOUT[item.id])}>
            <BlurFade inView direction="up" offset={24} delay={0.06 * index} className="h-full">
              <MagicCard
                gradientSize={260}
                gradientColor="color-mix(in oklch, var(--app-expense) 8%, transparent)"
                gradientFrom="var(--app-expense)"
                gradientTo="oklch(0.82 0.14 85)"
                className="h-full rounded-[28px] [--color-background:var(--app-surface)] [--color-border:var(--app-border)]"
              >
                <article className="flex h-full flex-col p-6">
                  <div className={cn("grid min-h-44 flex-1", item.id === "live-feed" && "min-h-80")}>
                    {visuals[item.id]}
                  </div>
                  <h3 className="font-display text-app-fg m-0 mt-6 text-xl font-bold tracking-[-0.02em]">
                    {item.title}
                  </h3>
                  <p className="text-app-muted m-0 mt-2 text-[15px] leading-relaxed">{item.description}</p>
                </article>
              </MagicCard>
            </BlurFade>
          </li>
        ))}
      </ul>
    </section>
  );
}
