"use client";

import { motion, useReducedMotion } from "motion/react";
import { CloudOff, Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { NumberTicker } from "@/core/components/ui/number-ticker";
import { CategoryEmoji } from "@/features/category/components/category-emoji";
import { EASE_OUT, SPRING_PRESS } from "@/lib/ease";
import { donutArcs } from "../../lib/donut";
import { FOOD, Glow, HOME, Pop, SceneFrame, TRANSPORT } from "./scene-primitives";

interface MonthSceneProps {
  currency: string;
}

const DONUT_CENTER = 56;
const DONUT_RADIUS = 46;
const DONUT_STROKE = 14;
const DONUT_GAP = 3;
const CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

const SLICES = [
  { key: "food", share: 0.45, color: "var(--app-expense)", category: FOOD },
  { key: "transport", share: 0.3, color: "oklch(0.72 0.12 240)", category: TRANSPORT },
  { key: "home", share: 0.25, color: "oklch(0.72 0.1 300)", category: HOME },
] as const;

const ARCS = donutArcs(SLICES, CIRCUMFERENCE);

const SAMPLE_BALANCE = 1240;
const SAMPLE_BALANCE_LABEL = "1,240";

const LEGEND_HIDDEN = { opacity: 0, x: -8 };
const LEGEND_VISIBLE = { opacity: 1, x: 0 };

export function MonthScene({ currency }: MonthSceneProps) {
  const t = useTranslations("onboarding.steps.month");
  const locale = useLocale();
  const reduceMotion = useReducedMotion();

  return (
    <SceneFrame>
      <Glow className="-top-24 -left-20 bg-[color-mix(in_oklch,oklch(0.72_0.12_240)_22%,transparent)]" />

      <div className="relative flex items-center gap-5">
        <div className="relative size-32">
          <svg viewBox="0 0 112 112" className="size-32 -rotate-90">
            <circle
              cx={DONUT_CENTER}
              cy={DONUT_CENTER}
              r={DONUT_RADIUS}
              fill="none"
              strokeWidth={DONUT_STROKE}
              className="stroke-[var(--app-fill)]"
            />
            {ARCS.map((arc, index) => (
              <motion.circle
                key={arc.key}
                cx={DONUT_CENTER}
                cy={DONUT_CENTER}
                r={DONUT_RADIUS}
                fill="none"
                strokeWidth={DONUT_STROKE}
                stroke={arc.color}
                strokeDasharray={`${arc.length - DONUT_GAP} ${CIRCUMFERENCE}`}
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
            {reduceMotion ? SAMPLE_BALANCE_LABEL : <NumberTicker value={SAMPLE_BALANCE} locale={locale} />}
          </p>
          <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0">
            {SLICES.map((slice, index) => (
              <motion.li
                key={slice.key}
                initial={reduceMotion ? false : LEGEND_HIDDEN}
                animate={LEGEND_VISIBLE}
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
    </SceneFrame>
  );
}
