"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, QrCode } from "lucide-react";
import { CategoryEmoji } from "@/features/category/ui/category-emoji";
import type { DemoReceipt } from "../../../content";
import { formatAmount } from "../../../lib/format";

const SCAN = { top: ["8%", "88%"] };
const SCAN_TRANSITION = { duration: 2.2, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" } as const;
const CHIP_HIDDEN = { opacity: 0, x: -12 };
const CHIP_VISIBLE = { opacity: 1, x: 0 };
const CHIP_VIEWPORT = { once: true, amount: 0.8 };
const CHIP_TRANSITION = { type: "spring", stiffness: 320, damping: 24, delay: 0.3 } as const;

interface ReceiptVisualProps {
  receipt: DemoReceipt;
  currency: string;
  locale: string;
}

export function ReceiptVisual({ receipt, currency, locale }: ReceiptVisualProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div aria-hidden className="flex h-full flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
      <div className="bg-app-bg relative w-52 overflow-hidden rounded-2xl p-4 ring-1 ring-[var(--app-border)]">
        <p className="text-app-fg m-0 text-center text-xs font-bold tracking-wide uppercase">{receipt.merchant}</p>
        <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 border-y border-dashed border-[var(--app-border)] p-0 py-3">
          {receipt.lines.map((line) => (
            <li key={line.label} className="text-app-muted flex justify-between text-xs">
              <span>{line.label}</span>
              <span className="num">{formatAmount(line.amount, locale)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-end justify-between">
          <span className="text-app-fg num text-sm font-bold">
            {receipt.total} {currency} {formatAmount(receipt.amount, locale)}
          </span>
          <QrCode className="text-app-fg size-8" strokeWidth={1.6} />
        </div>
        {!reduceMotion && (
          <motion.span
            animate={SCAN}
            transition={SCAN_TRANSITION}
            className="bg-brand-leaf absolute inset-x-2 h-0.5 rounded-full shadow-[0_0_12px_2px_color-mix(in_oklch,var(--brand-leaf)_60%,transparent)]"
          />
        )}
      </div>
      <ArrowRight className="text-app-muted size-4 rotate-90 sm:rotate-0" />
      <motion.div
        initial={reduceMotion ? false : CHIP_HIDDEN}
        whileInView={CHIP_VISIBLE}
        viewport={CHIP_VIEWPORT}
        transition={CHIP_TRANSITION}
        className="flex flex-col items-center gap-2 sm:items-start"
      >
        <span className="bg-app-fg text-app-bg flex items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-sm font-semibold">
          <CategoryEmoji category={receipt.category} className="size-7 rounded-full text-sm" />
          <span className="num">
            − {currency} {formatAmount(receipt.amount, locale)}
          </span>
        </span>
        <span className="text-app-muted text-xs font-medium">{receipt.method}</span>
      </motion.div>
    </div>
  );
}
