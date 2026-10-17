import type { ListTotals } from "../../../../types";

export interface TypeTotals {
  expense: number;
  income: number;
  count: number;
}

interface TotalsGroup {
  type: string;
  _sum: { amount: { toString(): string } | null };
  _count: { _all: number };
}

export const EMPTY_TOTALS: TypeTotals = { expense: 0, income: 0, count: 0 };

function addGroup(totals: TypeTotals, group: TotalsGroup) {
  const amount = Number(group._sum.amount?.toString() ?? 0);
  totals.count += group._count._all;

  if (group.type === "expense") {
    totals.expense += amount;
    return;
  }
  totals.income += amount;
}

export function totalsBy<K extends string>(groups: (TotalsGroup & Record<K, string | null>)[], key: K) {
  const totals = new Map<string, TypeTotals>();

  for (const group of groups) {
    const id = group[key];
    if (!id) continue;

    const current = totals.get(id) ?? { ...EMPTY_TOTALS };
    addGroup(current, group);
    totals.set(id, current);
  }

  return totals;
}

export function sumTotals(totals: Iterable<TypeTotals>): TypeTotals {
  const sum = { ...EMPTY_TOTALS };

  for (const { expense, income, count } of totals) {
    sum.expense += expense;
    sum.income += income;
    sum.count += count;
  }

  return sum;
}

export function toListTotals({ expense, income, count }: TypeTotals): ListTotals {
  return { count, expenseTotal: expense, incomeTotal: income };
}
