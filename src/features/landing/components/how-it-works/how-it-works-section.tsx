import { StickyScroll } from "@/core/components/ui/sticky-scroll-reveal";
import type { LandingContent } from "../../content";
import { SectionHeading } from "../shared/section-heading";
import { MonthPreview, SignUpPreview, TypePreview } from "./step-previews";

interface HowItWorksSectionProps {
  steps: LandingContent["steps"];
  phrases: string[];
  dashboard: LandingContent["showcase"]["dashboard"];
  common: LandingContent["common"];
  locale: string;
}

export function HowItWorksSection({ steps, phrases, dashboard, common, locale }: HowItWorksSectionProps) {
  // una vista previa por paso, en el mismo orden que steps.items
  const previews = [
    <SignUpPreview key="signup" preview={steps.preview} />,
    <TypePreview key="type" phrases={phrases} savedLabel={steps.preview.savedLabel} />,
    <MonthPreview key="month" dashboard={dashboard} common={common} locale={locale} />,
  ];

  return (
    <section
      id="como-funciona"
      aria-labelledby="como-funciona-title"
      className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-24 sm:px-6 md:pt-32"
    >
      <SectionHeading id="como-funciona-title" eyebrow={steps.eyebrow} title={steps.title} />
      <StickyScroll
        className="mt-8"
        content={steps.items.map((item, index) => ({ ...item, content: previews[index] }))}
      />
    </section>
  );
}
