"use client";

import { motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { TypingAnimation } from "@/core/components/ui/typing-animation";
import { CategoryEmoji } from "@/features/transaction/components/category-emoji";
import { EASE_OUT } from "@/lib/ease";
import type { LandingContent } from "../../content";
import { formatAmount, vivid } from "../../lib/format";

/*
 * Vistas previas de los pasos de "Cómo funciona". Son decorativas: el texto
 * de cada paso ya describe lo que se ve.
 */

const frame =
  "relative flex h-88 w-full flex-col justify-center overflow-hidden rounded-[28px] p-8 lg:h-full";

export function SignUpPreview({ preview }: { preview: LandingContent["steps"]["preview"] }) {
  return (
    <div aria-hidden className={`${frame} bg-app-fg text-app-bg`}>
      <div className="pointer-events-none absolute -top-20 -right-16 size-64 rounded-full bg-[color-mix(in_oklch,var(--app-expense)_40%,transparent)] blur-3xl" />
      <p className="relative m-0 text-sm font-semibold opacity-70">{preview.signUpLabel}</p>
      <ul className="relative m-0 mt-4 flex list-none flex-col gap-3 p-0">
        {preview.signUpProviders.map((provider, index) => (
          <motion.li
            key={provider}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.12 * index, ease: EASE_OUT }}
            className="bg-app-bg/10 flex h-12 items-center justify-between rounded-2xl px-4 text-sm font-semibold ring-1 ring-white/10"
          >
            {provider}
            <span className="text-app-bg/50">→</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

export function TypePreview({
  phrases,
  savedLabel,
}: {
  phrases: string[];
  savedLabel: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div aria-hidden className={`${frame} bg-app-surface ring-1 ring-[var(--app-border)]`}>
      <div className="bg-app-bg flex min-h-14 items-center rounded-2xl px-4 ring-1 ring-[var(--app-border)]">
        {reduceMotion ? (
          <span className="text-app-fg text-lg font-medium">{phrases[0]}</span>
        ) : (
          <TypingAnimation
            words={phrases}
            loop
            typeSpeed={70}
            pauseDelay={1400}
            startOnView={false}
            className="text-app-fg text-lg leading-normal font-medium tracking-normal"
          />
        )}
      </div>
      <div className="mt-6 flex items-center gap-3">
        <span className="bg-app-income-soft text-app-income grid size-9 place-items-center rounded-full">
          <Check className="size-4" />
        </span>
        <span className="text-app-fg text-sm font-semibold">{savedLabel}</span>
      </div>
    </div>
  );
}

/** Dona del mes: cada categoría es un arco proporcional a su gasto. */
export function MonthPreview({
  dashboard,
  common,
  locale,
}: {
  dashboard: LandingContent["showcase"]["dashboard"];
  common: LandingContent["common"];
  locale: string;
}) {
  const reduceMotion = useReducedMotion();
  const total = dashboard.categories.reduce((sum, category) => sum + category.total, 0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  const arcs = dashboard.categories.reduce<{ offset: number; items: { key: string; color: string; length: number; offset: number }[] }>(
    (acc, category) => {
      const length = (category.total / total) * circumference;
      acc.items.push({ key: category.name, color: category.color, length, offset: acc.offset });
      acc.offset += length;
      return acc;
    },
    { offset: 0, items: [] },
  ).items;

  return (
    <div aria-hidden className={`${frame} bg-app-surface ring-1 ring-[var(--app-border)]`}>
      <div className="flex items-center gap-6">
        <svg viewBox="0 0 128 128" className="size-36 shrink-0 -rotate-90">
          {arcs.map((arc, index) => (
            <motion.circle
              key={arc.key}
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              strokeWidth="16"
              stroke={vivid(arc.color)}
              strokeDasharray={`${arc.length - 2} ${circumference}`}
              strokeDashoffset={-arc.offset}
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1 * index, ease: EASE_OUT }}
            />
          ))}
        </svg>
        <div>
          <p className="text-app-muted m-0 text-xs font-semibold">{dashboard.period}</p>
          <p className="font-display text-app-fg m-0 mt-1 text-2xl font-bold tracking-[-0.03em]">
            <span className="text-app-muted mr-1 text-sm">{common.currency}</span>
            {formatAmount(dashboard.totals.expense, locale)}
          </p>
          <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0">
            {dashboard.categories.slice(0, 3).map((category) => (
              <li key={category.name} className="flex items-center gap-2 text-xs">
                <CategoryEmoji category={category} className="size-5 rounded-md text-[11px]" />
                <span className="text-app-fg font-semibold">{category.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
