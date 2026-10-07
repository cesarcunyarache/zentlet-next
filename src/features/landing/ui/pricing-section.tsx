import { Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { BlurFade } from "@/core/components/ui/blur-fade";
import { ShimmerLink } from "@/core/components/ui/shimmer-button";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { LandingContent, PricingPlan, SectionId } from "../content";
import { sectionTitleId } from "../lib/format";
import { CtaArrow } from "./shared/cta-arrow";
import { SectionHeading } from "./shared/section-heading";
import { BRAND_ACCENT } from "./shared/tokens";

const SECTION: SectionId = "precios";
const STAGGER_S = 0.1;

export function PricingSection({ pricing }: { pricing: LandingContent["pricing"] }) {
  const titleId = sectionTitleId(SECTION);

  return (
    <section
      id={SECTION}
      aria-labelledby={titleId}
      className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-6 md:py-32"
    >
      <SectionHeading id={titleId} eyebrow={pricing.eyebrow} title={pricing.title} subtitle={pricing.subtitle} />

      <div className="mx-auto mt-14 grid max-w-4xl gap-5 md:grid-cols-2">
        {pricing.plans.map((plan, index) => (
          <BlurFade key={plan.id} inView direction="up" offset={16} delay={STAGGER_S * index} className="h-full">
            <PlanCard plan={plan} />
          </BlurFade>
        ))}
      </div>
    </section>
  );
}

function PlanCard({ plan }: { plan: PricingPlan }) {
  const isFeatured = plan.id === "pro";

  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-[32px] p-8",
        isFeatured ? "bg-app-fg text-app-bg" : "bg-app-surface text-app-fg ring-1 ring-[var(--app-border)]",
      )}
    >
      <header className="flex items-center justify-between gap-3">
        <h3 className="font-display m-0 text-xl font-bold tracking-[-0.02em]">{plan.name}</h3>
        {plan.badge && (
          <span className="bg-app-bg/10 text-app-bg rounded-full px-3 py-1 text-xs font-semibold">{plan.badge}</span>
        )}
      </header>

      <p className="m-0 mt-6 flex items-baseline gap-2">
        <span className="font-display text-5xl font-bold tracking-[-0.04em]">{plan.price}</span>
        {plan.period && <span className={isFeatured ? "text-app-bg/70" : "text-app-muted"}>{plan.period}</span>}
      </p>
      <p className={cn("m-0 mt-3 leading-relaxed", isFeatured ? "text-app-bg/70" : "text-app-muted")}>
        {plan.description}
      </p>

      <ul className="m-0 mt-8 flex list-none flex-col gap-3 p-0">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <Check className={cn("mt-1 size-4 shrink-0", isFeatured ? "text-brand-leaf" : "text-brand-jade")} strokeWidth={2.6} aria-hidden />
            {feature}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-10">
        <PlanCta label={plan.cta} isFeatured={isFeatured} />
        {plan.note && <p className="text-app-bg/60 m-0 mt-3 text-center text-sm">{plan.note}</p>}
      </div>
    </article>
  );
}

function PlanCta({ label, isFeatured }: { label: string; isFeatured: boolean }) {
  if (!isFeatured) {
    return (
      <Link
        href={siteConfig.routes.signUp}
        className="bg-app-fill hover:bg-app-fill-strong text-app-fg inline-flex h-13 w-full items-center justify-center rounded-full px-6 text-base font-semibold transition-colors"
      >
        {label}
      </Link>
    );
  }

  return (
    <ShimmerLink
      href={siteConfig.routes.signUp}
      background="var(--app-bg)"
      shimmerColor={BRAND_ACCENT}
      className="text-app-fg h-13 w-full gap-2 px-8 text-base font-semibold"
    >
      {label}
      <CtaArrow />
    </ShimmerLink>
  );
}
