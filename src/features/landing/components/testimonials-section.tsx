import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Quote } from "lucide-react";
import { BlurFade } from "@/core/components/ui/blur-fade";
import { BorderBeam } from "@/core/components/ui/border-beam";
import { Marquee } from "@/core/components/ui/marquee";
import { siteConfig } from "@/lib/site";
import type { LandingContent, Testimonial } from "../content";
import { SectionHeading } from "./shared/section-heading";

export function TestimonialsSection({ testimonials }: { testimonials: LandingContent["testimonials"] }) {
  const { items } = testimonials;
  const half = Math.ceil(items.length / 2);

  return (
    <section
      id="testimonios"
      aria-labelledby="testimonios-title"
      className="scroll-mt-24 overflow-hidden py-24 md:py-32"
    >
      <div className="px-4 sm:px-6">
        <SectionHeading
          id="testimonios-title"
          eyebrow={testimonials.eyebrow}
          title={testimonials.title}
          subtitle={testimonials.subtitle}
        />
      </div>

      {items.length > 0 ? (
        <div className="relative mt-14 flex flex-col gap-2 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <Marquee pauseOnHover className="[--duration:50s]">
            {items.slice(0, half).map((item) => (
              <TestimonialCard key={item.name} testimonial={item} />
            ))}
          </Marquee>
          {items.length > 3 && (
            <Marquee reverse pauseOnHover className="[--duration:50s]">
              {items.slice(half).map((item) => (
                <TestimonialCard key={item.name} testimonial={item} />
              ))}
            </Marquee>
          )}
        </div>
      ) : (
        <BlurFade inView direction="up" offset={20} className="mx-auto mt-14 max-w-xl px-4">
          <div className="bg-app-surface relative flex flex-col items-center overflow-hidden rounded-[28px] px-6 py-12 text-center ring-1 ring-[var(--app-border)]">
            <BorderBeam size={140} duration={10} colorFrom="var(--app-expense)" colorTo="oklch(0.82 0.14 85)" />
            <span className="bg-app-fill text-app-fg grid size-12 place-items-center rounded-2xl">
              <Quote className="size-5" aria-hidden />
            </span>
            <h3 className="font-display text-app-fg m-0 mt-5 text-2xl font-bold tracking-[-0.02em]">
              {testimonials.empty.title}
            </h3>
            <p className="text-app-muted m-0 mt-3 max-w-sm leading-relaxed">{testimonials.empty.body}</p>
            <Link
              href={siteConfig.routes.signUp}
              className="bg-app-fg text-app-bg group mt-7 inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-transform hover:-translate-y-0.5"
            >
              {testimonials.empty.cta}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </div>
        </BlurFade>
      )}
    </section>
  );
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const initials = testimonial.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <figure className="bg-app-surface m-0 flex w-80 flex-col gap-5 rounded-3xl p-6 ring-1 ring-[var(--app-border)]">
      <blockquote className="text-app-fg m-0 text-[15px] leading-relaxed">“{testimonial.quote}”</blockquote>
      <figcaption className="mt-auto flex items-center gap-3">
        {testimonial.avatar ? (
          <Image
            src={testimonial.avatar}
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-full object-cover"
          />
        ) : (
          <span aria-hidden className="bg-app-fill text-app-fg grid size-10 place-items-center rounded-full text-sm font-bold">
            {initials}
          </span>
        )}
        <span className="flex flex-col">
          <span className="text-app-fg text-sm font-semibold">{testimonial.name}</span>
          <span className="text-app-muted text-xs">{testimonial.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}
