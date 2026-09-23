"use client";

import { motion, useReducedMotion } from "motion/react";
import { AnimatedList } from "@/core/components/ui/animated-list";
import { NumberTicker } from "@/core/components/ui/number-ticker";
import { CategoryEmoji } from "@/features/transaction/components/category-emoji";
import { EASE_OUT } from "@/lib/ease";
import type { LandingContent } from "../../content";
import { formatAmount, vivid } from "../../lib/format";
import { MovementRow } from "../shared/movement-row";

interface AppDashboardMockProps {
  dashboard: LandingContent["showcase"]["dashboard"];
  movements: LandingContent["movements"];
  common: LandingContent["common"];
  locale: string;
}

/** Pantalla principal de la app, a escala, con datos de ejemplo. */
export function AppDashboardMock({ dashboard, movements, common, locale }: AppDashboardMockProps) {
  const reduceMotion = useReducedMotion();
  const { totals, categories } = dashboard;
  const max = Math.max(...categories.map((category) => category.total));

  return (
    <div aria-hidden className="grid h-full gap-4 overflow-hidden p-4 md:grid-cols-[1.15fr_1fr] md:p-6">
      <div className="flex min-h-0 flex-col gap-4">
        {/* resumen del mes */}
        <div className="bg-app-surface rounded-3xl p-5 shadow-[0_1px_2px_color-mix(in_oklch,var(--app-fg)_6%,transparent)]">
          <div className="flex items-center justify-between">
            <p className="text-app-muted m-0 text-sm font-semibold">{dashboard.greeting}</p>
            <span className="bg-app-fill text-app-fg rounded-full px-3 py-1 text-xs font-semibold">
              {dashboard.period}
            </span>
          </div>
          <p className="text-app-muted m-0 mt-4 text-xs font-semibold">{common.balance}</p>
          <p className="font-display text-app-fg m-0 mt-1 text-4xl leading-none font-bold tracking-[-0.04em] md:text-5xl">
            <span className="text-app-muted mr-2 text-xl font-semibold">{common.currency}</span>
            <NumberTicker value={totals.balance} decimalPlaces={2} locale={locale} />
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="bg-app-income-soft text-app-income num rounded-full px-3 py-1 text-xs font-semibold">
              + {formatAmount(totals.income, locale)}
            </span>
            <span className="bg-app-expense-soft text-app-expense num rounded-full px-3 py-1 text-xs font-semibold">
              − {formatAmount(totals.expense, locale)}
            </span>
          </div>
        </div>

        {/* reparto por categoría: barras que crecen al entrar en vista */}
        <div className="bg-app-surface flex min-h-0 flex-1 flex-col rounded-3xl p-5 shadow-[0_1px_2px_color-mix(in_oklch,var(--app-fg)_6%,transparent)]">
          <p className="text-app-muted m-0 text-xs font-semibold">{dashboard.byCategory}</p>
          <ul className="m-0 mt-3 flex list-none flex-col gap-2.5 p-0">
            {categories.map((category, index) => (
              <li key={category.name} className="flex items-center gap-3">
                <CategoryEmoji category={category} className="size-8 rounded-xl text-base" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-app-fg truncate text-xs font-semibold">{category.name}</span>
                    <span className="num text-app-muted text-[11px]">{formatAmount(category.total, locale)}</span>
                  </div>
                  <div className="bg-app-fill mt-1 h-1.5 overflow-hidden rounded-full">
                    <motion.div
                      className="h-full origin-left rounded-full"
                      style={{ background: vivid(category.color) }}
                      initial={reduceMotion ? false : { scaleX: 0 }}
                      whileInView={{ scaleX: category.total / max }}
                      viewport={{ once: true, amount: 0.6 }}
                      transition={{ duration: 0.9, delay: 0.1 * index, ease: EASE_OUT }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* últimos movimientos entrando uno a uno */}
      <div className="bg-app-surface hidden min-h-0 flex-col rounded-3xl p-5 shadow-[0_1px_2px_color-mix(in_oklch,var(--app-fg)_6%,transparent)] md:flex">
        <p className="text-app-muted m-0 mb-4 text-xs font-semibold">{dashboard.recent}</p>
        <div className="relative min-h-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,black_75%,transparent)]">
          <AnimatedList delay={1400} className="gap-3">
            {movements.map((movement) => (
              <div key={movement.id} className="bg-app-bg w-full rounded-2xl p-3">
                <MovementRow movement={movement} currency={common.currency} locale={locale} />
              </div>
            ))}
          </AnimatedList>
        </div>
      </div>
    </div>
  );
}
