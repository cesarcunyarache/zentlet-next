import { Sparkles } from "lucide-react";
import { ShimmerLink } from "@/core/components/ui/shimmer-button";
import { siteConfig } from "@/lib/site";
import type { LandingContent } from "../../content";
import { sectionHref } from "../../lib/format";
import { CtaArrow } from "../shared/cta-arrow";
import { HeroTitleWords } from "./hero-title-words";

export const HERO_TITLE_ID = "hero-title";

const RISE_IN_STEP_MS = 100;

function riseInDelay(step: number): React.CSSProperties {
  return { animationDelay: `${step * RISE_IN_STEP_MS}ms` };
}

export function HeroCopy({ hero }: { hero: LandingContent["hero"] }) {
  return (
    <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
      <span
        style={riseInDelay(0)}
        className="animate-rise-in bg-app-surface text-app-fg inline-flex items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-sm font-medium shadow-[0_4px_16px_-8px_color-mix(in_oklch,var(--app-fg)_30%,transparent)] ring-1 ring-[var(--app-border)]"
      >
        <span className="bg-brand-jade text-brand-cream grid size-6 place-items-center rounded-full">
          <Sparkles className="size-3.5" aria-hidden />
        </span>
        {hero.badge}
      </span>

      <h1
        id={HERO_TITLE_ID}
        style={riseInDelay(1)}
        className="animate-rise-in font-display text-app-fg mt-6 mb-0 text-5xl leading-[0.95] font-bold tracking-[-0.05em] sm:text-6xl lg:text-7xl"
      >
        <span className="block">{hero.titleLead}</span>{" "}
        <HeroTitleWords words={hero.titleWords} />
      </h1>

      <p
        style={riseInDelay(2)}
        className="animate-rise-in text-app-muted mt-5 mb-0 max-w-xl text-lg leading-relaxed text-pretty sm:text-xl"
      >
        {hero.subtitle}
      </p>

      <div
        style={riseInDelay(3)}
        className="animate-rise-in mt-9 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row"
      >
        <ShimmerLink
          href={siteConfig.routes.signUp}
          background="var(--brand-jade)"
          shimmerColor="var(--brand-leaf)"
          className="text-brand-cream h-13 w-full gap-2 px-7 text-base font-semibold sm:w-auto"
        >
          {hero.primaryCta}
          <CtaArrow />
        </ShimmerLink>
        <a
          href={sectionHref("como-funciona")}
          className="text-app-fg hover:bg-app-fill inline-flex h-13 w-full items-center justify-center rounded-full px-6 text-base font-semibold ring-1 ring-[var(--app-border)] transition-colors sm:w-auto"
        >
          {hero.secondaryCta}
        </a>
      </div>

      <p style={riseInDelay(4)} className="animate-rise-in text-app-muted mt-5 mb-0 text-sm">
        {hero.note}
      </p>
    </div>
  );
}
