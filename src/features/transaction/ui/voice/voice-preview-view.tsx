"use client";

import { motion } from "motion/react";
import { cn } from "@heroui/react";
import { Mic, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { SPRING_LAYOUT, SPRING_PRESS } from "@/lib/ease";
import { CategoryEmoji } from "@/features/category/ui/category-emoji";
import { dayLabel } from "@/lib/dates";
import { formatNumber } from "@/lib/money";
import type { VoiceDraft } from "../../lib/parse-voice";
import type { TransactionFormValues } from "../../schemas/transaction.schema";
import type { CategoryLike } from "../../types";
import { VOICE_VIEW_MOTION } from "./voice-view-motion";

const MIC_ICON = <Mic className="size-4" strokeWidth={2} />;

interface VoicePreviewViewProps {
  transcript: string;
  draft: VoiceDraft;
  values: TransactionFormValues;
  currency: string;
  categories: CategoryLike[];
  isAiSuggested: boolean;
  onPickCategory: (categoryId: string) => void;
  onRetry: () => void;
  redoLabel?: string;
  redoIcon?: React.ReactNode;
  noAmountLabel?: string;
}

export function VoicePreviewView({
  transcript,
  draft,
  values,
  currency,
  categories,
  isAiSuggested,
  onPickCategory,
  onRetry,
  redoLabel,
  redoIcon = MIC_ICON,
  noAmountLabel,
}: VoicePreviewViewProps) {
  const t = useTranslations("transactions");
  const locale = useLocale();
  const isIncome = values.type === "income";
  const category = categories.find((c) => c.id === draft.categoryId);

  return (
    <motion.div {...VOICE_VIEW_MOTION} className="flex flex-col gap-5 pt-5 pb-2">
      <div className="flex items-start justify-between gap-3">
        <p className="text-app-muted m-0 text-sm leading-snug">
          <span aria-hidden>“</span>
          {transcript}
          <span aria-hidden>”</span>
        </p>
        <button
          type="button"
          onClick={onRetry}
          aria-label={redoLabel ?? t("voice.redo")}
          className="bg-app-fill hover:bg-app-fill-strong text-app-fg grid size-9 shrink-0 place-items-center rounded-full transition-colors"
        >
          {redoIcon}
        </button>
      </div>

      <div className="bg-app-surface rounded-3xl p-5 ring-1 ring-[var(--app-border)]">
        <span
          className={cn(
            "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
            isIncome ? "bg-app-income-soft text-app-income" : "bg-app-expense-soft text-app-expense",
          )}
        >
          {t(`type.${values.type}`)}
        </span>

        <PreviewAmount
          amount={draft.amount}
          isIncome={isIncome}
          currency={currency}
          noAmountLabel={noAmountLabel ?? t("voice.noAmount")}
        />

        <dl className="m-0 mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
          <dt className="text-app-muted">{t("fields.category")}</dt>
          <dd className="text-app-fg m-0 flex items-center gap-1.5 font-semibold">
            <PreviewCategory category={category} isAiSuggested={isAiSuggested} />
          </dd>
          <dt className="text-app-muted">{t("fields.date")}</dt>
          <dd className="text-app-fg m-0 font-semibold">{dayLabel(draft.transactionDate, locale)}</dd>
          <dt className="text-app-muted">{t("fields.description")}</dt>
          <dd className="text-app-fg m-0 font-semibold">{values.description}</dd>
        </dl>
      </div>

      <VoiceCategoryPicker
        label={t("voice.changeCategory")}
        categories={categories}
        selectedId={draft.categoryId}
        onPick={onPickCategory}
      />
    </motion.div>
  );
}

interface PreviewAmountProps {
  amount: VoiceDraft["amount"];
  isIncome: boolean;
  currency: string;
  noAmountLabel: string;
}

function PreviewAmount({ amount, isIncome, currency, noAmountLabel }: PreviewAmountProps) {
  if (!amount) return <p className="text-app-expense m-0 mt-3 text-sm font-semibold">{noAmountLabel}</p>;

  return (
    <p className="font-display text-app-fg m-0 mt-3 flex items-baseline gap-1.5 text-[44px] leading-none font-bold tracking-[-0.04em] tabular-nums">
      <span className="text-app-muted text-xl font-semibold">
        {isIncome ? "+" : "−"} {currency}
      </span>
      {formatNumber(amount)}
    </p>
  );
}

interface PreviewCategoryProps {
  category: CategoryLike | undefined;
  isAiSuggested: boolean;
}

function PreviewCategory({ category, isAiSuggested }: PreviewCategoryProps) {
  const t = useTranslations("transactions.voice");

  if (!category) return <span className="text-app-expense">{t("pickBelow")}</span>;

  return (
    <>
      <CategoryEmoji category={category} className="size-6 rounded-full text-[13px]" />
      {category.name}
      {isAiSuggested ? <Sparkles aria-label={t("aiSuggested")} className="size-3.5" strokeWidth={2.2} /> : null}
    </>
  );
}

interface VoiceCategoryPickerProps {
  label: string;
  categories: CategoryLike[];
  selectedId: string | null;
  onPick: (categoryId: string) => void;
}

function VoiceCategoryPicker({ label, categories, selectedId, onPick }: VoiceCategoryPickerProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className="scroll-clean -mx-[22px] flex gap-2 overflow-x-auto px-[22px] sm:-mx-7 sm:px-7"
    >
      {categories.map((option) => {
        const isActive = option.id === selectedId;
        return (
          <motion.button
            key={option.id}
            type="button"
            aria-pressed={isActive}
            whileTap={{ scale: 0.94 }}
            transition={SPRING_PRESS}
            onClick={() => onPick(option.id)}
            className={cn(
              "relative flex min-h-10 shrink-0 items-center gap-2 rounded-full py-0 pr-3.5 pl-1.5 text-[13px] font-semibold transition-colors",
              isActive ? "text-app-surface" : "bg-app-fill text-app-fg hover:bg-app-fill-strong",
            )}
          >
            {isActive ? (
              <motion.span
                layoutId="voice-category-pill"
                transition={SPRING_LAYOUT}
                className="bg-app-fg absolute inset-0 rounded-full"
              />
            ) : null}
            <CategoryEmoji category={option} className="relative size-7 rounded-full text-[14px]" />
            <span className="relative">{option.name}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
