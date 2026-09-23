import { Plus } from "lucide-react";
import { BlurFade } from "@/core/components/ui/blur-fade";
import type { LandingContent } from "../content";
import { SectionHeading } from "./shared/section-heading";

/** Acordeón nativo (<details>): accesible y sin JavaScript. */
export function FaqSection({ faq }: { faq: LandingContent["faq"] }) {
  return (
    <section
      id="preguntas"
      aria-labelledby="preguntas-title"
      className="mx-auto grid max-w-6xl scroll-mt-24 gap-12 px-4 py-24 sm:px-6 md:py-32 lg:grid-cols-[1fr_1.4fr]"
    >
      <SectionHeading id="preguntas-title" eyebrow={faq.eyebrow} title={faq.title} align="left" />

      <div className="flex flex-col gap-3">
        {faq.items.map((item, index) => (
          <BlurFade key={item.question} inView direction="up" offset={12} delay={0.05 * index}>
            <details className="group bg-app-surface rounded-3xl ring-1 ring-[var(--app-border)] transition-shadow open:shadow-[0_16px_40px_-24px_color-mix(in_oklch,var(--app-fg)_40%,transparent)]">
              <summary className="text-app-fg flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-base font-semibold [&::-webkit-details-marker]:hidden">
                {item.question}
                <span className="bg-app-fill grid size-8 shrink-0 place-items-center rounded-full transition-transform duration-300 group-open:rotate-45">
                  <Plus className="size-4" aria-hidden />
                </span>
              </summary>
              <p className="text-app-muted m-0 px-6 pb-6 leading-relaxed">{item.answer}</p>
            </details>
          </BlurFade>
        ))}
      </div>
    </section>
  );
}
