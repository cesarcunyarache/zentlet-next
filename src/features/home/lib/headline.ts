import type { TransactionType } from "@/features/transaction/types";

export type HeadlineTone = "income" | "expense" | "neutral";

export interface Headline {
  value: number;
  label: string;
  tone: HeadlineTone;
}

export interface HeadlineLabels {
  category: string;
  expenses: string;
  income: string;
  total: string;
}

interface HeadlineInput {
  categoryId: string | null;
  categoryName: string | undefined;
  categoryValue: number;
  kind: TransactionType | null;
  expenseTotal: number;
  incomeTotal: number;
  accountBalance: number;
  labels: HeadlineLabels;
}

export function headlineFor(input: HeadlineInput): Headline {
  const { categoryId, categoryName, categoryValue, kind, expenseTotal, incomeTotal, accountBalance, labels } = input;

  if (categoryId) {
    const tone = categoryValue > 0 ? "income" : "expense";
    return { value: categoryValue, label: categoryName ?? labels.category, tone };
  }

  if (kind === "expense") return { value: -expenseTotal, label: labels.expenses, tone: "expense" };
  if (kind === "income") return { value: incomeTotal, label: labels.income, tone: "income" };

  const tone = accountBalance < 0 ? "neutral" : "income";
  return { value: accountBalance, label: labels.total, tone };
}
