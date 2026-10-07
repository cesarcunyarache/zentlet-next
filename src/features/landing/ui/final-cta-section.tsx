import { Link } from "@/i18n/navigation";
import { BlurFade } from "@/core/components/ui/blur-fade";
import { BorderBeam } from "@/core/components/ui/border-beam";
import { DotPattern } from "@/core/components/ui/dot-pattern";
import { ShimmerLink } from "@/core/components/ui/shimmer-button";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { LandingContent } from "../content";
import { CtaArrow } from "./shared/cta-arrow";
import { BRAND_ACCENT, DARK_PANEL_CLASS, GROWTH_ACCENT, LIGHT_ACCENT } from "./shared/tokens";

const TITLE_ID = "cta-title";
const FADE_OFFSET = 20;

export function FinalCtaSection({ cta }: { cta: LandingContent["cta"] }) {
  return (
    <section aria-labelledby={TITLE_ID} className="px-3 pb-24 sm:px-6">
      <div className={cn(DARK_PANEL_CLASS, "flex flex-col items-center px-6 py-24 text-center md:py-32")}>
        <DotPattern
          width={22}
          height={22}
          className="text-app-bg/15 [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 left-1/2 size-[40rem] -translate-x-1/2 rounded-full bg-brand-leaf/35 blur-3xl"
        />
        <BorderBeam size={220} duration={12} colorFrom={GROWTH_ACCENT} colorTo={LIGHT_ACCENT} borderWidth={2} />

        <BlurFade inView direction="up" offset={FADE_OFFSET} className="relative">
          <h2
            id={TITLE_ID}
            className="font-display text-app-bg m-0 max-w-3xl text-4xl leading-[1.02] font-bold tracking-[-0.045em] text-balance md:text-6xl"
          >
            {cta.title}
          </h2>
        </BlurFade>
        <BlurFade inView direction="up" offset={FADE_OFFSET} delay={0.1} className="relative">
          <p className="text-app-bg/70 m-0 mt-5 max-w-xl text-lg">{cta.subtitle}</p>
        </BlurFade>
        <BlurFade
          inView
          direction="up"
          offset={FADE_OFFSET}
          delay={0.2}
          className="relative mt-10 flex w-full flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <ShimmerLink
            href={siteConfig.routes.signUp}
            background="var(--app-bg)"
            shimmerColor={BRAND_ACCENT}
            className="text-app-fg h-13 w-full gap-2 px-8 text-base font-semibold sm:w-auto"
          >
            {cta.primary}
            <CtaArrow />
          </ShimmerLink>
          <Link
            href={siteConfig.routes.signIn}
            className="text-app-bg inline-flex h-13 w-full items-center justify-center rounded-full px-6 text-base font-semibold ring-1 ring-white/20 transition-colors hover:bg-white/10 sm:w-auto"
          >
            {cta.secondary}
          </Link>
        </BlurFade>
      </div>
    </section>
  );
}
