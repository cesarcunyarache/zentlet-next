import type { CategoryTotal } from "../components/category-strip";
import type { CategoryLike, CategoryTotals, TransactionType } from "../types";

export function categoryValue(totals: CategoryTotals | undefined, kind: TransactionType | null) {
  if (!totals) return 0;
  if (kind === "expense") return -totals.expense;
  if (kind === "income") return totals.income;
  return totals.income - totals.expense;
}

export interface BudgetBar {
  limit: number;
  spent: number;
}

interface StripInput {
  categories: CategoryLike[];
  byCategory: Record<string, CategoryTotals> | undefined;
  kind: TransactionType | null;
  budgetFor: (categoryId: string) => BudgetBar | null;
}

const visibleSize = ({ total, budget }: CategoryTotal) => Math.max(Math.abs(total), budget ?? 0);

function toStripBar(category: CategoryLike, { byCategory, kind, budgetFor }: StripInput): CategoryTotal {
  const bar = kind === "income" ? null : budgetFor(category.id);
  if (!bar) return { category, total: categoryValue(byCategory?.[category.id], kind), budget: null };
  return { category, total: bar.spent > 0 ? -bar.spent : 0, budget: bar.limit };
}

export function buildStripData(input: StripInput): CategoryTotal[] {
  return input.categories
    .map((category) => toStripBar(category, input))
    .sort((a, b) => visibleSize(b) - visibleSize(a));
}
