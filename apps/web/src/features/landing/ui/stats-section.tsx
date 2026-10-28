import { BlurFade } from "@/core/components/ui/blur-fade";
import { NumberTicker } from "@/core/components/ui/number-ticker";
import { cn } from "@/lib/utils";
import type { LandingContent } from "../content";
import { getTickerRange } from "../lib/visuals";
import { SectionHeading } from "./shared/section-heading";
import { DARK_PANEL_CLASS } from "./shared/tokens";

const TITLE_ID = "stats-title";
const FADE_STAGGER_S = 0.08;
const TICKER_BASE_DELAY_S = 0.2;
const TICKER_STAGGER_S = 0.1;

type StatItem = LandingContent["stats"]["items"][number];

interface StatsSectionProps {
  stats: LandingContent["stats"];
  locale: string;
}

export function StatsSection({ stats, locale }: StatsSectionProps) {
  return (
    <section aria-labelledby={TITLE_ID} className="px-3 py-12 sm:px-6">
      <div className={cn(DARK_PANEL_CLASS, "px-6 py-20 md:px-12")}>
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-brand-leaf/30 blur-3xl"
        />

        <SectionHeading id={TITLE_ID} eyebrow={stats.eyebrow} title={stats.title} isInverted className="relative" />

        <dl className="relative m-0 mt-14 grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
          {stats.items.map((item, index) => (
            <BlurFade
              key={item.label}
              inView
              direction="up"
              offset={16}
              delay={FADE_STAGGER_S * index}
              className="flex flex-col-reverse items-center gap-2 text-center"
            >
              <Stat item={item} index={index} locale={locale} />
            </BlurFade>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Stat({ item, index, locale }: { item: StatItem; index: number; locale: string }) {
  const range = getTickerRange(item);

  return (
    <>
      <dt className="text-app-on-panel/70 min-h-[2lh] max-w-[16ch] text-sm leading-snug">{item.label}</dt>
      <dd className="font-display text-app-on-panel m-0 text-5xl font-bold tracking-[-0.05em] md:text-6xl">
        {item.prefix}
        <NumberTicker
          value={range.value}
          startValue={range.startValue}
          direction={range.direction}
          delay={TICKER_BASE_DELAY_S + TICKER_STAGGER_S * index}
          locale={locale}
        />
        {item.suffix}
      </dd>
    </>
  );
}
