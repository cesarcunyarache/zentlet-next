"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { ShimmerLink } from "@/core/components/ui/shimmer-button";
import { WordRotate } from "@/core/components/ui/word-rotate";
import { EASE_OUT } from "@/lib/ease";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { LandingContent } from "../../content";
import { formatAmount, sectionHref } from "../../lib/format";
import { FloatCard, Parallax, PointerScene, Tilt } from "../shared/pointer-scene";
import { ExpenseComposerDemo } from "./expense-composer-demo";

/** Confeti del fondo: color, posición y cuánto se desplaza con el puntero. */
const PETALS = [
  { className: "top-[16%] left-[6%] size-4 rounded-full", color: "var(--app-expense)", depth: 18 },
  { className: "top-[22%] right-[8%] h-5 w-9 -rotate-[24deg] rounded-full", color: "var(--app-expense)", depth: 30 },
  { className: "bottom-[14%] left-[10%] h-3 w-6 rotate-[35deg] rounded-full", color: "var(--app-income)", depth: 24 },
  { className: "top-[58%] right-[3%] size-3 rounded-full", color: "oklch(0.62 0.16 265)", depth: 14 },
  { className: "bottom-[8%] right-[30%] h-4 w-7 rotate-[12deg] rounded-full", color: "oklch(0.82 0.14 85)", depth: 36 },
  { className: "top-[40%] left-[46%] size-2.5 rounded-full", color: "oklch(0.82 0.14 85)", depth: 12 },
];

const BARS = [
  { icon: "🏠", color: "oklch(0.72 0.12 300)", value: 88 },
  { icon: "🛒", color: "oklch(0.78 0.13 75)", value: 56 },
  { icon: "🍜", color: "oklch(0.75 0.12 30)", value: 40 },
  { icon: "🚕", color: "oklch(0.74 0.11 230)", value: 26 },
];

interface HeroSectionProps {
  hero: LandingContent["hero"];
  common: LandingContent["common"];
  totals: LandingContent["showcase"]["dashboard"]["totals"];
  locale: string;
}

export function HeroSection({ hero, common, totals, locale }: HeroSectionProps) {
  const reduceMotion = useReducedMotion();

  return (
    <PointerScene className="relative isolate overflow-hidden">
      <section
        aria-labelledby="hero-title"
        className="relative mx-auto grid min-h-svh max-w-6xl items-center gap-14 px-4 pt-32 pb-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:pt-28"
      >
        {/* fondo: retícula de puntos que se desvanece y halo */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 [background-image:radial-gradient(color-mix(in_oklch,var(--app-fg)_14%,transparent)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-0 -z-10 size-[70vmin] -translate-y-1/2 rounded-full bg-[color-mix(in_oklch,var(--app-expense)_10%,transparent)] blur-3xl"
        />

        {PETALS.map((petal, index) => (
          <Parallax
            key={index}
            decorative
            depth={-petal.depth}
            className={cn("pointer-events-none absolute -z-10 opacity-80", petal.className)}
            style={{ background: petal.color }}
          />
        ))}

        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <span
            style={{ animationDelay: "0ms" }}
            className="animate-rise-in bg-app-surface text-app-fg inline-flex items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-sm font-medium shadow-[0_4px_16px_-8px_color-mix(in_oklch,var(--app-fg)_30%,transparent)] ring-1 ring-[var(--app-border)]"
          >
            <span className="bg-app-fg text-app-bg grid size-6 place-items-center rounded-full">
              <Sparkles className="size-3.5" aria-hidden />
            </span>
            {hero.badge}
          </span>

          <h1
            id="hero-title"
            style={{ animationDelay: "100ms" }}
            className="animate-rise-in font-display text-app-fg mt-6 mb-0 text-5xl leading-[0.95] font-bold tracking-[-0.05em] sm:text-6xl lg:text-7xl"
          >
            <span className="block">{hero.titleLead}</span>
            {/* sin este espacio el título se lee "clarosen" (SEO y lectores) */}
            {" "}
            <WordRotate
              words={hero.titleWords}
              duration={2800}
              className="text-app-expense whitespace-nowrap"
              motionProps={
                reduceMotion
                  ? {}
                  : {
                      initial: { opacity: 0, y: "60%", filter: "blur(8px)" },
                      animate: { opacity: 1, y: 0, filter: "blur(0px)" },
                      exit: { opacity: 0, y: "-60%", filter: "blur(8px)" },
                      transition: { duration: 0.45, ease: EASE_OUT },
                    }
              }
            />
          </h1>

          <p
            style={{ animationDelay: "200ms" }}
            className="animate-rise-in text-app-muted mt-5 mb-0 max-w-xl text-lg leading-relaxed text-pretty sm:text-xl"
          >
            {hero.subtitle}
          </p>

          <div
            style={{ animationDelay: "300ms" }}
            className="animate-rise-in mt-9 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row"
          >
            <ShimmerLink
              href={siteConfig.routes.signUp}
              background="var(--app-fg)"
              shimmerColor="oklch(0.85 0.12 30)"
              className="h-13 w-full gap-2 px-7 text-base font-semibold sm:w-auto"
            >
              {hero.primaryCta}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </ShimmerLink>
            <a
              href={sectionHref("como-funciona")}
              className="text-app-fg hover:bg-app-fill inline-flex h-13 w-full items-center justify-center rounded-full px-6 text-base font-semibold ring-1 ring-[var(--app-border)] transition-colors sm:w-auto"
            >
              {hero.secondaryCta}
            </a>
          </div>

          <p
            style={{ animationDelay: "400ms" }}
            className="animate-rise-in text-app-muted mt-5 mb-0 text-sm"
          >
            {hero.note}
          </p>
        </div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.25, ease: EASE_OUT }}
          className="relative mx-auto w-full max-w-[440px] py-10"
        >
          <Tilt>
            <ExpenseComposerDemo demo={hero.demo} common={common} locale={locale} />
          </Tilt>

          <Parallax
            decorative
            depth={22}
            className="absolute -top-2 -left-4 w-[190px] -rotate-[6deg] sm:-left-12"
          >
            <FloatCard delay={0.4}>
              <p className="text-app-muted m-0 text-[11px] font-semibold">{common.balance}</p>
              <p className="font-display text-app-income m-0 mt-0.5 text-[26px] leading-none font-bold tracking-[-0.04em] tabular-nums">
                <span className="text-app-muted mr-1 text-sm font-semibold">{common.currency}</span>
                {formatAmount(totals.balance, locale)}
              </p>
            </FloatCard>
          </Parallax>

          <Parallax
            decorative
            depth={32}
            className="absolute -right-3 -bottom-4 w-[150px] rotate-[6deg] sm:-right-10"
          >
            <FloatCard delay={1.4} className="p-3">
              <div className="flex h-16 items-end gap-2">
                {BARS.map((bar) => (
                  <div key={bar.icon} className="flex flex-1 flex-col items-center gap-1">
                    <span
                      className="w-full rounded-md"
                      style={{ height: `${bar.value}%`, background: bar.color }}
                    />
                    <span className="text-[11px] leading-none">{bar.icon}</span>
                  </div>
                ))}
              </div>
            </FloatCard>
          </Parallax>

          <Parallax decorative depth={40} className="absolute bottom-10 -left-2 sm:-left-8">
            <span className="bg-app-expense text-app-surface grid size-12 place-items-center rounded-full text-2xl font-light shadow-[var(--shadow-fab)]">
              +
            </span>
          </Parallax>
        </motion.div>
      </section>
    </PointerScene>
  );
}
