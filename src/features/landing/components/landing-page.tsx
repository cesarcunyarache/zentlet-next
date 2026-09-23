import type { LandingContent } from "../content";
import { buildLandingJsonLd } from "../lib/seo";
import { FaqSection } from "./faq-section";
import { FeaturesSection } from "./features/features-section";
import { FinalCtaSection } from "./final-cta-section";
import { HeroSection } from "./hero/hero-section";
import { HowItWorksSection } from "./how-it-works/how-it-works-section";
import { LandingMotion } from "./landing-motion";
import { ManifestoSection } from "./manifesto-section";
import { ShowcaseSection } from "./showcase/showcase-section";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { StatsSection } from "./stats-section";
import { TestimonialsSection } from "./testimonials-section";

/**
 * Landing completa. Recibe el contenido ya resuelto por idioma; ningún
 * componente de aquí abajo tiene texto propio.
 */
export function LandingPage({ content }: { content: LandingContent }) {
  const { locale, common, showcase, movements } = content;
  const jsonLd = JSON.stringify(buildLandingJsonLd(content)).replace(/</g, "\\u003c");

  return (
    <LandingMotion>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <div className="bg-app-bg text-app-fg min-h-svh font-[family-name:var(--font-geist-sans)] antialiased">
        <SiteHeader nav={content.nav} />

        <main>
          <HeroSection hero={content.hero} common={common} totals={showcase.dashboard.totals} locale={locale} />
          <ShowcaseSection showcase={showcase} movements={movements} common={common} locale={locale} />
          <ManifestoSection text={content.manifesto} />
          <FeaturesSection
            features={content.features}
            movements={movements}
            common={common}
            balance={showcase.dashboard.totals.balance}
            locale={locale}
          />
          <HowItWorksSection
            steps={content.steps}
            phrases={content.features.samples.phrases}
            dashboard={showcase.dashboard}
            common={common}
            locale={locale}
          />
          <StatsSection stats={content.stats} locale={locale} />
          <TestimonialsSection testimonials={content.testimonials} />
          <FaqSection faq={content.faq} />
          <FinalCtaSection cta={content.cta} />
        </main>

        <SiteFooter footer={content.footer} nav={content.nav} />
      </div>
    </LandingMotion>
  );
}
