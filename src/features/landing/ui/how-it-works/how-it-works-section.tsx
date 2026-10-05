import { StickyScroll } from "@/core/components/ui/sticky-scroll-reveal";
import type { LandingContent, SectionId } from "../../content";
import { sectionTitleId } from "../../lib/format";
import { SectionHeading } from "../shared/section-heading";
import { MonthPreview } from "./month-preview";
import { SignUpPreview } from "./sign-up-preview";
import { TypePreview } from "./type-preview";

const SECTION: SectionId = "como-funciona";

interface HowItWorksSectionProps {
  steps: LandingContent["steps"];
  phrases: string[];
  dashboard: LandingContent["showcase"]["dashboard"];
  common: LandingContent["common"];
  locale: string;
}

export function HowItWorksSection({ steps, phrases, dashboard, common, locale }: HowItWorksSectionProps) {
  const titleId = sectionTitleId(SECTION);
  const previews = [
    <SignUpPreview key="signup" preview={steps.preview} />,
    <TypePreview key="type" phrases={phrases} savedLabel={steps.preview.savedLabel} />,
    <MonthPreview key="month" dashboard={dashboard} common={common} locale={locale} />,
  ];

  return (
    <section
      id={SECTION}
      aria-labelledby={titleId}
      className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-24 sm:px-6 md:pt-32"
    >
      <SectionHeading id={titleId} eyebrow={steps.eyebrow} title={steps.title} />
      <StickyScroll
        className="mt-8"
        content={steps.items.map((item, index) => ({ ...item, content: previews[index] }))}
      />
    </section>
  );
}
