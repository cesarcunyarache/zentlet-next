import { BlurFade } from "@/core/components/ui/blur-fade";
import { MagicCard } from "@/core/components/ui/magic-card";
import { cn } from "@/lib/utils";
import type { FeatureId, LandingContent, SectionId } from "../../content";
import { sectionTitleId } from "../../lib/format";
import { SectionHeading } from "../shared/section-heading";
import { BRAND_ACCENT, GROWTH_ACCENT } from "../shared/tokens";
import { AiCategoryVisual } from "./visuals/ai-category-visual";
import { BalanceVisual } from "./visuals/balance-visual";
import { BudgetsVisual } from "./visuals/budgets-visual";
import { CategoriesVisual } from "./visuals/categories-visual";
import { CurrencyVisual } from "./visuals/currency-visual";
import { LiveFeedVisual } from "./visuals/live-feed-visual";
import { NaturalInputVisual } from "./visuals/natural-input-visual";
import { ReceiptVisual } from "./visuals/receipt-visual";
import { RecurringVisual } from "./visuals/recurring-visual";
import { VoiceVisual } from "./visuals/voice-visual";

const SECTION: SectionId = "funciones";
const FADE_STAGGER_S = 0.06;
const TALL_FEATURE: FeatureId = "live-feed";

const GRID_PLACEMENT: Record<FeatureId, string> = {
  "natural-input": "md:col-span-2",
  "ai-category": "",
  voice: "",
  receipt: "md:col-span-2",
  budgets: "md:col-span-2",
  recurring: "",
  "live-feed": "md:row-span-2",
  balance: "",
  categories: "",
  currency: "md:col-span-2",
};

type FeatureItem = LandingContent["features"]["items"][number];

interface FeaturesSectionProps {
  features: LandingContent["features"];
  movements: LandingContent["movements"];
  common: LandingContent["common"];
  balance: number;
  locale: string;
}

export function FeaturesSection({ features, movements, common, balance, locale }: FeaturesSectionProps) {
  const { samples } = features;
  const { currency } = common;
  const titleId = sectionTitleId(SECTION);

  const visuals: Record<FeatureId, React.ReactNode> = {
    "natural-input": <NaturalInputVisual phrases={samples.phrases} />,
    "ai-category": <AiCategoryVisual from={samples.suggestionFrom} category={samples.suggestionCategory} />,
    voice: <VoiceVisual transcript={samples.voiceTranscript} />,
    receipt: <ReceiptVisual receipt={samples.receipt} currency={currency} locale={locale} />,
    budgets: (
      <BudgetsVisual budgets={samples.budgets} labels={samples.budgetLabels} currency={currency} locale={locale} />
    ),
    recurring: <RecurringVisual movements={samples.recurring} currency={currency} locale={locale} />,
    "live-feed": <LiveFeedVisual movements={movements} currency={currency} locale={locale} />,
    balance: <BalanceVisual value={balance} currency={currency} locale={locale} />,
    categories: <CategoriesVisual ideas={samples.categoryIdeas} />,
    currency: <CurrencyVisual currencies={samples.currencies} />,
  };

  return (
    <section id={SECTION} aria-labelledby={titleId} className="mx-auto max-w-6xl px-4 py-24 sm:px-6 md:py-32">
      <SectionHeading id={titleId} eyebrow={features.eyebrow} title={features.title} subtitle={features.subtitle} />

      <ul className="m-0 mt-16 grid list-none auto-rows-[minmax(22rem,auto)] grid-cols-1 gap-4 p-0 md:grid-cols-3">
        {features.items.map((item, index) => (
          <li key={item.id} className={cn("min-w-0", GRID_PLACEMENT[item.id])}>
            <BlurFade inView direction="up" offset={24} delay={FADE_STAGGER_S * index} className="h-full">
              <FeatureCard item={item} visual={visuals[item.id]} />
            </BlurFade>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FeatureCard({ item, visual }: { item: FeatureItem; visual: React.ReactNode }) {
  return (
    <MagicCard
      gradientSize={260}
      gradientColor="color-mix(in oklch, var(--brand-leaf) 12%, transparent)"
      gradientFrom={BRAND_ACCENT}
      gradientTo={GROWTH_ACCENT}
      className="h-full rounded-[28px] [--color-background:var(--app-surface)] [--color-border:var(--app-border)]"
    >
      <article className="flex h-full flex-col p-6">
        <div className={cn("grid min-h-44 flex-1", item.id === TALL_FEATURE && "min-h-80")}>{visual}</div>
        <h3 className="font-display text-app-fg m-0 mt-6 flex items-center gap-2 text-xl font-bold tracking-[-0.02em]">
          {item.title}
          {item.badge && (
            <span className="bg-brand-leaf/15 text-brand-ink rounded-full px-2.5 py-0.5 font-sans text-xs font-semibold tracking-normal">
              {item.badge}
            </span>
          )}
        </h3>
        <p className="text-app-muted m-0 mt-2 text-[15px] leading-relaxed">{item.description}</p>
      </article>
    </MagicCard>
  );
}
