import { ContainerScroll } from "@/core/components/ui/container-scroll-animation";
import type { LandingContent } from "../../content";
import { SectionHeading } from "../shared/section-heading";
import { AppDashboardMock } from "./app-dashboard-mock";

interface ShowcaseSectionProps {
  showcase: LandingContent["showcase"];
  movements: LandingContent["movements"];
  common: LandingContent["common"];
  locale: string;
}

/** La app completa, que se endereza mientras bajas. */
export function ShowcaseSection({ showcase, movements, common, locale }: ShowcaseSectionProps) {
  return (
    <section id="producto" aria-labelledby="producto-title" className="relative -mt-24 overflow-hidden md:-mt-40">
      <ContainerScroll
        titleComponent={
          <SectionHeading
            id="producto-title"
            eyebrow={showcase.eyebrow}
            title={showcase.title}
            subtitle={showcase.subtitle}
            className="mb-16 px-4"
          />
        }
      >
        <AppDashboardMock
          dashboard={showcase.dashboard}
          movements={movements}
          common={common}
          locale={locale}
        />
      </ContainerScroll>
    </section>
  );
}
