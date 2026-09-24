"use client";

import { motion, useReducedMotion } from "motion/react";
import { CloudOff, Lock, Mic, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { NumberTicker } from "@/core/components/ui/number-ticker";
import { TypingAnimation } from "@/core/components/ui/typing-animation";
import { CategoryEmoji } from "@/features/transaction/components/category-emoji";
import { EASE_OUT, SPRING_PRESS } from "@/lib/ease";

/*
 * Ilustraciones animadas de los pasos de bienvenida. Son decorativas: el
 * título y el texto de cada paso ya dicen lo mismo. Con "reducir
 * movimiento" quedan quietas.
 */

const FRAME =
  "relative flex h-[300px] w-full flex-col items-center justify-center overflow-hidden rounded-[32px] bg-app-surface ring-1 ring-[var(--app-border)]";

const TRANSPORT = { icon: "🚌", color: "#D6E8F7" };
const FOOD = { icon: "🍽️", color: "#FBDDD5" };
const HOME = { icon: "🏠", color: "#E4DDF3" };

function Glow({ className }: { className: string }) {
  return <div aria-hidden className={`pointer-events-none absolute size-56 rounded-full blur-3xl ${className}`} />;
}

/** Aparece con un pequeño rebote tras `delay` segundos. */
function Pop({ delay, children, className }: { delay: number; children: React.ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, scale: 0.8, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ ...SPRING_PRESS, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function TypeScene() {
  const t = useTranslations("onboarding.steps.type");
  const reduceMotion = useReducedMotion();
  const phrase = t("phrase");

  return (
    <div aria-hidden className={FRAME}>
      <Glow className="-top-24 -right-20 bg-[color-mix(in_oklch,var(--app-expense)_22%,transparent)]" />
      <div className="relative w-[82%]">
        <div className="bg-app-bg flex min-h-14 items-center rounded-2xl px-4 shadow-[0_10px_30px_-18px_color-mix(in_oklch,var(--app-ink)_40%,transparent)] ring-1 ring-[var(--app-border)]">
          {reduceMotion ? (
            <span className="text-app-fg text-lg font-medium">{phrase}</span>
          ) : (
            <TypingAnimation
              startOnView={false}
              delay={300}
              typeSpeed={70}
              className="text-app-fg text-lg leading-normal font-medium tracking-normal"
            >
              {phrase}
            </TypingAnimation>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Pop delay={1.5} className="bg-app-expense-soft text-app-expense rounded-full px-3 py-1.5 text-[13px] font-semibold">
            {t("expense")}
          </Pop>
          <Pop delay={1.75} className="bg-app-fill text-app-fg flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-[13px] font-semibold">
            <CategoryEmoji category={TRANSPORT} className="size-7 rounded-full text-sm" />
            {t("category")}
          </Pop>
        </div>

        <Pop delay={2.1} className="text-app-muted mt-4 flex items-center gap-1.5 text-xs font-medium">
          <motion.span
            animate={reduceMotion ? undefined : { rotate: [0, 18, -10, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.2 }}
            className="text-app-expense inline-flex"
          >
            <Sparkles className="size-3.5" />
          </motion.span>
          {t("detected")}
        </Pop>
      </div>
    </div>
  );
}

const BAR_HEIGHTS = [14, 26, 38, 22, 32, 18, 10];

export function VoiceScene({ currency }: { currency: string }) {
  const t = useTranslations("onboarding.steps.voice");
  const reduceMotion = useReducedMotion();

  return (
    <div aria-hidden className={FRAME}>
      <Glow className="-bottom-28 -left-16 bg-[color-mix(in_oklch,var(--app-income)_20%,transparent)]" />

      <div className="relative grid size-24 place-items-center">
        {!reduceMotion &&
          [0, 1, 2].map((ring) => (
            <motion.span
              key={ring}
              className="bg-app-expense absolute inset-0 rounded-full"
              initial={{ opacity: 0.35, scale: 0.7 }}
              animate={{ opacity: 0, scale: 1.9 }}
              transition={{ duration: 2.4, repeat: Infinity, delay: ring * 0.8, ease: EASE_OUT }}
            />
          ))}
        <span className="bg-app-expense text-app-surface relative grid size-16 place-items-center rounded-full shadow-[var(--shadow-fab)]">
          <Mic className="size-7" strokeWidth={2.2} />
        </span>
      </div>

      <div className="relative mt-3 flex h-10 items-center gap-1">
        {BAR_HEIGHTS.map((height, index) => (
          <motion.span
            key={index}
            className="bg-app-fg/70 w-1 rounded-full"
            style={{ height }}
            animate={reduceMotion ? undefined : { scaleY: [0.35, 1, 0.5, 0.9, 0.35] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: index * 0.09, ease: "easeInOut" }}
          />
        ))}
      </div>

      <div className="bg-app-fill text-app-fg relative mt-2 rounded-2xl rounded-bl-md px-4 py-2 text-sm font-medium">
        {reduceMotion ? (
          <span>«{t("phrase")}»</span>
        ) : (
          <TypingAnimation startOnView={false} delay={500} typeSpeed={55} showCursor={false} className="text-sm leading-normal font-medium tracking-normal">
            {`«${t("phrase")}»`}
          </TypingAnimation>
        )}
      </div>

      <Pop
        delay={2.4}
        className="bg-app-bg relative mt-3 flex items-center gap-3 rounded-2xl py-2 pr-4 pl-2 shadow-[0_12px_30px_-16px_color-mix(in_oklch,var(--app-ink)_45%,transparent)] ring-1 ring-[var(--app-border)]"
      >
        <CategoryEmoji category={FOOD} className="size-9 rounded-xl text-base" />
        <span className="flex flex-col">
          <span className="text-app-fg text-sm font-semibold">{t("category")}</span>
          <span className="text-app-muted text-xs">{t("yesterday")}</span>
        </span>
        <span className="text-app-expense ml-3 text-sm font-bold">
          − {currency} 35.00
        </span>
      </Pop>
    </div>
  );
}

const RADIUS = 46;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SLICES = [
  { key: "food", share: 0.45, color: "var(--app-expense)", category: FOOD },
  { key: "transport", share: 0.3, color: "oklch(0.72 0.12 240)", category: TRANSPORT },
  { key: "home", share: 0.25, color: "oklch(0.72 0.1 300)", category: HOME },
] as const;

/** Cada porción de la dona empieza donde terminó la anterior. */
const ARCS = SLICES.map((slice, index) => ({
  ...slice,
  length: slice.share * CIRCUMFERENCE,
  offset: SLICES.slice(0, index).reduce((sum, previous) => sum + previous.share * CIRCUMFERENCE, 0),
}));

export function MonthScene({ currency }: { currency: string }) {
  const t = useTranslations("onboarding.steps.month");
  const locale = useLocale();
  const reduceMotion = useReducedMotion();

  return (
    <div aria-hidden className={FRAME}>
      <Glow className="-top-24 -left-20 bg-[color-mix(in_oklch,oklch(0.72_0.12_240)_22%,transparent)]" />

      <div className="relative flex items-center gap-5">
        <div className="relative size-32">
          <svg viewBox="0 0 112 112" className="size-32 -rotate-90">
            <circle cx="56" cy="56" r={RADIUS} fill="none" strokeWidth="14" className="stroke-[var(--app-fill)]" />
            {ARCS.map((arc, index) => (
              <motion.circle
                key={arc.key}
                cx="56"
                cy="56"
                r={RADIUS}
                fill="none"
                strokeWidth="14"
                stroke={arc.color}
                strokeDasharray={`${arc.length - 3} ${CIRCUMFERENCE}`}
                initial={reduceMotion ? false : { strokeDashoffset: -arc.offset + arc.length, opacity: 0 }}
                animate={{ strokeDashoffset: -arc.offset, opacity: 1 }}
                transition={{ duration: 0.9, delay: 0.25 + index * 0.25, ease: EASE_OUT }}
              />
            ))}
          </svg>
        </div>

        <div>
          <p className="text-app-muted m-0 text-xs font-semibold">{t("balance")}</p>
          <p className="font-display text-app-fg m-0 mt-0.5 text-3xl font-bold tracking-[-0.03em]">
            <span className="text-app-muted mr-1 text-sm font-semibold">{currency}</span>
            {reduceMotion ? "1,240" : <NumberTicker value={1240} locale={locale} />}
          </p>
          <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0">
            {SLICES.map((slice, index) => (
              <motion.li
                key={slice.key}
                initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...SPRING_PRESS, delay: 0.5 + index * 0.2 }}
                className="flex items-center gap-2 text-xs"
              >
                <CategoryEmoji category={slice.category} className="size-5 rounded-md text-[11px]" />
                <span className="text-app-fg font-semibold">{t(`categories.${slice.key}`)}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>

      <div className="relative mt-6 flex flex-wrap justify-center gap-2 px-4">
        <Pop delay={1.3} className="bg-app-income-soft text-app-income flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold">
          <CloudOff className="size-3.5" />
          {t("offline")}
        </Pop>
        <Pop delay={1.5} className="bg-app-fill text-app-fg flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold">
          <Lock className="size-3.5" />
          {t("private")}
        </Pop>
      </div>
    </div>
  );
}
