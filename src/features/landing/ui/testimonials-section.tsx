import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Quote } from "lucide-react";
import { BlurFade } from "@/core/components/ui/blur-fade";
import { BorderBeam } from "@/core/components/ui/border-beam";
import { Marquee } from "@/core/components/ui/marquee";
import { siteConfig } from "@/lib/site";
import type { LandingContent, SectionId, Testimonial } from "../content";
import { sectionTitleId } from "../lib/format";
import { getInitials, splitInHalf } from "../lib/visuals";
import { CtaArrow } from "./shared/cta-arrow";
import { SectionHeading } from "./shared/section-heading";
import { BRAND_ACCENT, GOLD_ACCENT } from "./shared/tokens";

const SECTION: SectionId = "testimonios";
const MAX_SINGLE_ROW_ITEMS = 3;
const AVATAR_SIZE = 40;

type TestimonialsContent = LandingContent["testimonials"];

export function TestimonialsSection({ testimonials }: { testimonials: TestimonialsContent }) {
  const titleId = sectionTitleId(SECTION);
  const hasTestimonials = testimonials.items.length > 0;

  return (
    <section id={SECTION} aria-labelledby={titleId} className="scroll-mt-24 overflow-hidden py-24 md:py-32">
      <div className="px-4 sm:px-6">
        <SectionHeading
          id={titleId}
          eyebrow={testimonials.eyebrow}
          title={testimonials.title}
          subtitle={testimonials.subtitle}
        />
      </div>

      {hasTestimonials ? (
        <TestimonialsMarquee items={testimonials.items} />
      ) : (
        <TestimonialsInvite empty={testimonials.empty} />
      )}
    </section>
  );
}

function TestimonialsMarquee({ items }: { items: Testimonial[] }) {
  const hasTwoRows = items.length > MAX_SINGLE_ROW_ITEMS;
  const [firstHalf, secondHalf] = splitInHalf(items);
  const firstRow = hasTwoRows ? firstHalf : items;

  return (
    <div className="relative mt-14 flex flex-col gap-2 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <Marquee pauseOnHover className="[--duration:50s]">
        {firstRow.map((item) => (
          <TestimonialCard key={item.name} testimonial={item} />
        ))}
      </Marquee>
      {hasTwoRows && (
        <Marquee reverse pauseOnHover className="[--duration:50s]">
          {secondHalf.map((item) => (
            <TestimonialCard key={item.name} testimonial={item} />
          ))}
        </Marquee>
      )}
    </div>
  );
}

function TestimonialsInvite({ empty }: { empty: TestimonialsContent["empty"] }) {
  return (
    <BlurFade inView direction="up" offset={20} className="mx-auto mt-14 max-w-xl px-4">
      <div className="bg-app-surface relative flex flex-col items-center overflow-hidden rounded-[28px] px-6 py-12 text-center ring-1 ring-[var(--app-border)]">
        <BorderBeam size={140} duration={10} colorFrom={BRAND_ACCENT} colorTo={GOLD_ACCENT} />
        <span className="bg-app-fill text-app-fg grid size-12 place-items-center rounded-2xl">
          <Quote className="size-5" aria-hidden />
        </span>
        <h3 className="font-display text-app-fg m-0 mt-5 text-2xl font-bold tracking-[-0.02em]">{empty.title}</h3>
        <p className="text-app-muted m-0 mt-3 max-w-sm leading-relaxed">{empty.body}</p>
        <Link
          href={siteConfig.routes.signUp}
          className="bg-app-fg text-app-bg group mt-7 inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-transform hover:-translate-y-0.5"
        >
          {empty.cta}
          <CtaArrow />
        </Link>
      </div>
    </BlurFade>
  );
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <figure className="bg-app-surface m-0 flex w-80 flex-col gap-5 rounded-3xl p-6 ring-1 ring-[var(--app-border)]">
      <blockquote className="text-app-fg m-0 text-[15px] leading-relaxed">“{testimonial.quote}”</blockquote>
      <figcaption className="mt-auto flex items-center gap-3">
        <TestimonialAvatar testimonial={testimonial} />
        <span className="flex flex-col">
          <span className="text-app-fg text-sm font-semibold">{testimonial.name}</span>
          <span className="text-app-muted text-xs">{testimonial.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}

function TestimonialAvatar({ testimonial }: { testimonial: Testimonial }) {
  if (!testimonial.avatar) {
    return (
      <span aria-hidden className="bg-app-fill text-app-fg grid size-10 place-items-center rounded-full text-sm font-bold">
        {getInitials(testimonial.name)}
      </span>
    );
  }

  return (
    <Image
      src={testimonial.avatar}
      alt=""
      width={AVATAR_SIZE}
      height={AVATAR_SIZE}
      className="size-10 rounded-full object-cover"
    />
  );
}
