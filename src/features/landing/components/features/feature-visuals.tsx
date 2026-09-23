"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Marquee } from "@/core/components/ui/marquee";
import { NumberTicker } from "@/core/components/ui/number-ticker";
import { CategoryEmoji } from "@/features/transaction/components/category-emoji";
import { EASE_OUT, SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import type { DemoMovement, LandingContent } from "../../content";
import { MovementRow } from "../shared/movement-row";

/*
 * Ilustraciones animadas de cada tarjeta del bento. Todas son decorativas
 * (aria-hidden): el título y la descripción de la tarjeta cuentan lo mismo.
 */

type Samples = LandingContent["features"]["samples"];

export function NaturalInputVisual({ phrases }: { phrases: Samples["phrases"] }) {
  const half = Math.ceil(phrases.length / 2);
  const rows = [phrases, [...phrases.slice(half), ...phrases.slice(0, half)]];

  return (
    <div aria-hidden className="relative flex h-full flex-col justify-center gap-1 [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
      {rows.map((row, index) => (
        <Marquee key={index} reverse={index === 1} pauseOnHover className="[--duration:28s] [--gap:0.75rem]">
          {row.map((phrase) => (
            <span
              key={phrase}
              className="bg-app-bg text-app-fg flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium ring-1 ring-[var(--app-border)]"
            >
              <span className="text-app-muted">“</span>
              {phrase}
              <span className="text-app-muted">”</span>
            </span>
          ))}
        </Marquee>
      ))}
    </div>
  );
}

export function AiCategoryVisual({
  from,
  category,
}: {
  from: string;
  category: Samples["suggestionCategory"];
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div aria-hidden className="flex h-full flex-col items-center justify-center gap-3">
      <span className="bg-app-bg text-app-fg rounded-2xl px-4 py-2.5 text-sm font-medium ring-1 ring-[var(--app-border)]">
        {from}
      </span>
      <motion.span
        animate={reduceMotion ? undefined : { y: [0, 4, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="text-app-muted"
      >
        <ArrowRight className="size-4 rotate-90" />
      </motion.span>
      <motion.span
        initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ type: "spring", stiffness: 380, damping: 22, delay: 0.2 }}
        className="bg-app-fg text-app-bg relative flex items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-sm font-semibold shadow-[0_12px_24px_-12px_color-mix(in_oklch,var(--app-fg)_70%,transparent)]"
      >
        <CategoryEmoji category={category} className="size-7 rounded-full text-sm" />
        {category.name}
        <Sparkles className="size-3.5 text-[oklch(0.85_0.12_85)]" />
      </motion.span>
    </div>
  );
}

export function LiveFeedVisual({
  movements,
  currency,
  locale,
}: {
  movements: DemoMovement[];
  currency: string;
  locale: string;
}) {
  return (
    // fuera del flujo: la lista no debe estirar la fila del bento
    <div aria-hidden className="relative h-full min-h-80 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)]">
      <Marquee vertical pauseOnHover repeat={3} className="absolute inset-0 [--duration:24s] [--gap:0.625rem]">
        {movements.map((movement) => (
          <div key={movement.id} className="bg-app-bg rounded-2xl p-3 ring-1 ring-[var(--app-border)]">
            <MovementRow movement={movement} currency={currency} locale={locale} />
          </div>
        ))}
      </Marquee>
    </div>
  );
}

/** Balance con una curva que se dibuja al entrar en vista. */
export function BalanceVisual({
  value,
  currency,
  locale,
}: {
  value: number;
  currency: string;
  locale: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div aria-hidden className="flex h-full flex-col justify-center gap-3">
      <p className="font-display text-app-income m-0 text-4xl leading-none font-bold tracking-[-0.04em]">
        <span className="text-app-muted mr-1.5 text-lg font-semibold">{currency}</span>
        <NumberTicker value={value} decimalPlaces={2} locale={locale} />
      </p>
      <svg viewBox="0 0 240 64" className="h-16 w-full overflow-visible" fill="none">
        <motion.path
          d="M2 52 C 30 50, 40 30, 66 34 S 104 56, 128 40 S 170 10, 196 18 S 228 12, 238 6"
          stroke="var(--app-income)"
          strokeWidth="3"
          strokeLinecap="round"
          initial={reduceMotion ? false : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, amount: 0.8 }}
          transition={{ duration: 1.6, ease: EASE_OUT }}
        />
      </svg>
    </div>
  );
}

export function CategoriesVisual({ ideas }: { ideas: Samples["categoryIdeas"] }) {
  const reduceMotion = useReducedMotion();

  return (
    <div aria-hidden className="grid h-full grid-cols-2 place-content-center gap-3">
      {ideas.map((idea, index) => (
        <motion.div
          key={idea.name}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.6, rotate: -8 }}
          whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
          whileHover={reduceMotion ? undefined : { scale: 1.06, rotate: index % 2 ? 3 : -3 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.08 * index }}
          className="flex flex-col items-center gap-1.5 rounded-2xl p-3"
          style={{ background: idea.color }}
        >
          <span className="text-2xl leading-none">{idea.icon}</span>
          <span className="text-app-fg text-xs font-semibold">{idea.name}</span>
        </motion.div>
      ))}
    </div>
  );
}

/** Selector de moneda que cambia solo; la píldora se desliza entre opciones. */
export function CurrencyVisual({ currencies }: { currencies: Samples["currencies"] }) {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = setInterval(() => setActive((value) => (value + 1) % currencies.length), 1800);
    return () => clearInterval(timer);
  }, [currencies.length, reduceMotion]);

  return (
    <div aria-hidden className="flex h-full items-center justify-center">
      <div className="bg-app-fill flex gap-1 rounded-full p-1.5">
        {currencies.map((currency, index) => (
          <span
            key={currency.symbol}
            className={cn(
              "relative flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-colors duration-300",
              index === active ? "text-app-bg" : "text-app-muted",
            )}
          >
            {index === active && (
              <motion.span
                layoutId="currency-pill"
                transition={SPRING_LAYOUT}
                className="bg-app-fg absolute inset-0 rounded-full"
              />
            )}
            <span className="num relative text-base">{currency.symbol}</span>
            <span className="relative hidden sm:inline">{currency.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
