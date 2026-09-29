import { cn } from "@/lib/utils";
import type { LandingContent } from "../../content";
import { PointerScene, Parallax } from "../shared/pointer-scene";
import { BRAND_ACCENT, GOLD_ACCENT } from "../shared/tokens";
import { HERO_TITLE_ID, HeroCopy } from "./hero-copy";
import { HeroVisual } from "./hero-visual";

const PETALS = [
  { id: "expense-dot", className: "top-[16%] left-[6%] size-4 rounded-full", color: BRAND_ACCENT, depth: 18 },
  { id: "expense-pill", className: "top-[22%] right-[8%] h-5 w-9 -rotate-[24deg] rounded-full", color: BRAND_ACCENT, depth: 30 },
  { id: "income-pill", className: "bottom-[14%] left-[10%] h-3 w-6 rotate-[35deg] rounded-full", color: "var(--app-income)", depth: 24 },
  { id: "indigo-dot", className: "top-[58%] right-[3%] size-3 rounded-full", color: "oklch(0.62 0.16 265)", depth: 14 },
  { id: "gold-pill", className: "bottom-[8%] right-[30%] h-4 w-7 rotate-[12deg] rounded-full", color: GOLD_ACCENT, depth: 36 },
  { id: "gold-dot", className: "top-[40%] left-[46%] size-2.5 rounded-full", color: GOLD_ACCENT, depth: 12 },
];

interface HeroSectionProps {
  hero: LandingContent["hero"];
  common: LandingContent["common"];
  totals: LandingContent["showcase"]["dashboard"]["totals"];
  locale: string;
}

export function HeroSection({ hero, common, totals, locale }: HeroSectionProps) {
  return (
    <PointerScene className="relative isolate overflow-hidden">
      <section
        aria-labelledby={HERO_TITLE_ID}
        className="relative mx-auto grid min-h-svh max-w-6xl items-center gap-14 px-4 pt-32 pb-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:pt-28"
      >
        <HeroBackdrop />
        <HeroCopy hero={hero} />
        <HeroVisual demo={hero.demo} common={common} balance={totals.balance} locale={locale} />
      </section>
    </PointerScene>
  );
}

function HeroBackdrop() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [background-image:radial-gradient(color-mix(in_oklch,var(--app-fg)_14%,transparent)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-0 -z-10 size-[70vmin] -translate-y-1/2 rounded-full bg-[color-mix(in_oklch,var(--app-expense)_10%,transparent)] blur-3xl"
      />
      {PETALS.map((petal) => (
        <Parallax
          key={petal.id}
          isDecorative
          depth={-petal.depth}
          className={cn("pointer-events-none absolute -z-10 opacity-80", petal.className)}
          style={{ background: petal.color }}
        />
      ))}
    </>
  );
}
