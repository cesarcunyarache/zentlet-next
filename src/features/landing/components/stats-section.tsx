import { BlurFade } from "@/core/components/ui/blur-fade";
import { NumberTicker } from "@/core/components/ui/number-ticker";
import type { LandingContent } from "../content";
import { SectionHeading } from "./shared/section-heading";

export function StatsSection({ stats, locale }: { stats: LandingContent["stats"]; locale: string }) {
  return (
    <section aria-labelledby="stats-title" className="px-3 py-12 sm:px-6">
      <div className="bg-app-fg relative mx-auto max-w-6xl overflow-hidden rounded-[36px] px-6 py-20 md:px-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-[color-mix(in_oklch,var(--app-expense)_30%,transparent)] blur-3xl"
        />

        <SectionHeading id="stats-title" eyebrow={stats.eyebrow} title={stats.title} inverted className="relative" />

        <dl className="relative m-0 mt-14 grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
          {stats.items.map((item, index) => {
            // NumberTicker, en modo "down", parte de `value` y termina en `startValue`
            const from = item.from ?? 0;
            const countDown = from > item.value;

            return (
              // BlurFade es el único <div> entre <dl> y el par <dt>/<dd>
              <BlurFade
                key={item.label}
                inView
                direction="up"
                offset={16}
                delay={0.08 * index}
                className="flex flex-col-reverse items-center gap-2 text-center"
              >
                <dt className="text-app-bg/70 min-h-[2lh] max-w-[16ch] text-sm leading-snug">{item.label}</dt>
                <dd className="font-display text-app-bg m-0 text-5xl font-bold tracking-[-0.05em] md:text-6xl">
                  {item.prefix}
                  <NumberTicker
                    value={countDown ? from : item.value}
                    startValue={countDown ? item.value : from}
                    direction={countDown ? "down" : "up"}
                    delay={0.2 + 0.1 * index}
                    locale={locale}
                  />
                  {item.suffix}
                </dd>
              </BlurFade>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
