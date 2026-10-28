"use client";

import { motion, useReducedMotion } from "motion/react";
import { CategoryEmoji } from "@/features/category/ui/category-emoji";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import type { LandingContent } from "../../content";
import { formatAmount, vivid } from "../../lib/format";
import { buildDonutArcs } from "../../lib/visuals";
import { PREVIEW_FRAME_CLASS } from "./preview-frame";

const DONUT_RADIUS = 52;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;
const ARC_GAP = 2;
const ARC_STAGGER_S = 0.1;
const LEGEND_SIZE = 3;
const HIDDEN = { opacity: 0 };
const VISIBLE = { opacity: 1 };

interface MonthPreviewProps {
  dashboard: LandingContent["showcase"]["dashboard"];
  common: LandingContent["common"];
  locale: string;
}

export function MonthPreview({ dashboard, common, locale }: MonthPreviewProps) {
  const reduceMotion = useReducedMotion();
  const arcs = buildDonutArcs(dashboard.categories, DONUT_CIRCUMFERENCE);

  return (
    <div aria-hidden className={cn(PREVIEW_FRAME_CLASS, "bg-app-surface ring-1 ring-[var(--app-border)]")}>
      <div className="flex items-center gap-6">
        <svg viewBox="0 0 128 128" className="size-36 shrink-0 -rotate-90">
          {arcs.map((arc, index) => (
            <motion.circle
              key={arc.key}
              cx="64"
              cy="64"
              r={DONUT_RADIUS}
              fill="none"
              strokeWidth="16"
              stroke={vivid(arc.color)}
              strokeDasharray={`${arc.length - ARC_GAP} ${DONUT_CIRCUMFERENCE}`}
              strokeDashoffset={-arc.offset}
              initial={reduceMotion ? false : HIDDEN}
              animate={VISIBLE}
              transition={{ duration: 0.6, delay: ARC_STAGGER_S * index, ease: EASE_OUT }}
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
            {dashboard.categories.slice(0, LEGEND_SIZE).map((category) => (
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
