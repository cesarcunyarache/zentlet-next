import { ContainerScroll } from "@/core/components/ui/container-scroll-animation";
import type { LandingContent, SectionId } from "../../content";
import { sectionTitleId } from "../../lib/format";
import { SectionHeading } from "../shared/section-heading";
import { AppDashboardMock } from "./app-dashboard-mock";

const SECTION: SectionId = "producto";

interface ShowcaseSectionProps {
  showcase: LandingContent["showcase"];
  movements: LandingContent["movements"];
  common: LandingContent["common"];
  locale: string;
}

export function ShowcaseSection({ showcase, movements, common, locale }: ShowcaseSectionProps) {
  const titleId = sectionTitleId(SECTION);

  return (
    <section id={SECTION} aria-labelledby={titleId} className="relative -mt-24 overflow-hidden md:-mt-40">
      <ContainerScroll
        titleComponent={
          <SectionHeading
            id={titleId}
            eyebrow={showcase.eyebrow}
            title={showcase.title}
            subtitle={showcase.subtitle}
            className="mb-16 px-4"
          />
        }
      >
        <AppDashboardMock dashboard={showcase.dashboard} movements={movements} common={common} locale={locale} />
      </ContainerScroll>
    </section>
  );
}
