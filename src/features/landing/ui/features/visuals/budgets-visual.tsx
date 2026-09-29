import { CategoryEmoji } from "@/features/category/ui/category-emoji";
import { cn } from "@/lib/utils";
import type { LandingContent } from "../../../content";
import { formatAmount, vivid } from "../../../lib/format";
import { getBudgetStatus } from "../../../lib/visuals";
import { GrowingBar } from "../../shared/growing-bar";

const BAR_STAGGER_S = 0.15;

type Samples = LandingContent["features"]["samples"];
type Budget = Samples["budgets"][number];

interface BudgetsVisualProps {
  budgets: Samples["budgets"];
  labels: Samples["budgetLabels"];
  currency: string;
  locale: string;
}

export function BudgetsVisual({ budgets, labels, currency, locale }: BudgetsVisualProps) {
  return (
    <ul aria-hidden className="m-0 grid h-full list-none content-center gap-4 p-0 md:grid-cols-3 md:gap-6">
      {budgets.map((item, index) => (
        <BudgetCard key={item.name} item={item} index={index} labels={labels} currency={currency} locale={locale} />
      ))}
    </ul>
  );
}

interface BudgetCardProps {
  item: Budget;
  index: number;
  labels: Samples["budgetLabels"];
  currency: string;
  locale: string;
}

function BudgetCard({ item, index, labels, currency, locale }: BudgetCardProps) {
  const { isOver, rest, ratio } = getBudgetStatus(item);

  return (
    <li className="bg-app-bg rounded-2xl p-4 ring-1 ring-[var(--app-border)]">
      <div className="flex items-center gap-2.5">
        <CategoryEmoji category={item} className="size-8 rounded-xl text-sm" />
        <span className="text-app-fg text-sm font-semibold">{item.name}</span>
        <span className="text-app-muted num ml-auto text-xs font-medium">
          {formatAmount(item.spent, locale)} / {formatAmount(item.budget, locale)}
        </span>
      </div>
      <GrowingBar
        ratio={ratio}
        color={isOver ? "var(--app-expense)" : vivid(item.color)}
        duration={1.1}
        delay={BAR_STAGGER_S * index}
        viewportAmount={0.8}
        className="mt-3 h-2.5"
      />
      <p className={cn("num m-0 mt-2 text-xs font-semibold", isOver ? "text-app-expense" : "text-app-muted")}>
        {isOver ? labels.over : labels.left} {currency} {formatAmount(rest, locale)}
      </p>
    </li>
  );
}
