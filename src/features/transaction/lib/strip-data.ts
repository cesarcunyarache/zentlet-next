import type { CategoryTotal } from "../components/category-strip";
import type { CategoryLike, CategoryTotals, TransactionType } from "../types";

/** Lo que suma o resta una categoría según el filtro: sólo gastos (negativo), sólo ingresos o el neto. */
export function categoryValue(totals: CategoryTotals | undefined, kind: TransactionType | null) {
  if (!totals) return 0;
  if (kind === "expense") return -totals.expense;
  if (kind === "income") return totals.income;
  return totals.income - totals.expense;
}

export interface BudgetBar {
  limit: number;
  /** Gastado en el periodo del presupuesto, que puede no ser el de la vista. */
  spent: number;
}

interface StripInput {
  categories: CategoryLike[];
  byCategory: Record<string, CategoryTotals> | undefined;
  kind: TransactionType | null;
  budgetFor: (categoryId: string) => BudgetBar | null;
}

const visibleSize = ({ total, budget }: CategoryTotal) => Math.max(Math.abs(total), budget ?? 0);

/** Barras de la tira, de mayor a menor alto visible. Con presupuesto la barra es lo gastado frente al tope. */
export function buildStripData({ categories, byCategory, kind, budgetFor }: StripInput): CategoryTotal[] {
  return categories
    .map((category) => {
      const bar = kind === "income" ? null : budgetFor(category.id);
      if (!bar) return { category, total: categoryValue(byCategory?.[category.id], kind), budget: null };
      return { category, total: bar.spent > 0 ? -bar.spent : 0, budget: bar.limit };
    })
    .sort((a, b) => visibleSize(b) - visibleSize(a));
}
