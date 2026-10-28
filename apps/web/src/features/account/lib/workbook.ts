import { getSheetData, type Sheet } from "write-excel-file/node";
import type { TransactionType } from "@/features/transaction/types";
import { budgetPeriodOf } from "@/features/budget/lib/period";
import type { BudgetKind, BudgetPeriod, BudgetPeriodUnit } from "@/features/budget/types";

export interface ExportTransaction {
  transactionDate: Date;
  type: string;
  amount: { toString(): string };
  description: string | null;
  reference: string | null;
  category: { name: string };
}

export interface ExportCategory {
  name: string;
  icon: string;
  color: string;
  description: string | null;
  createdAt: Date;
  _count: { transactions: number };
  budget: {
    kind: string;
    periodUnit: string;
    periodCount: number;
    limits: { amount: { toString(): string } }[];
  } | null;
}

export interface WorkbookLabels {
  sheets: { transactions: string; categories: string };
  columns: {
    date: string;
    type: string;
    category: string;
    description: string;
    amount: string;
    reference: string;
    name: string;
    icon: string;
    color: string;
    transactions: string;
    createdAt: string;
    budget: string;
    budgetPeriod: string;
  };
  types: Record<TransactionType, string>;
  budgetPeriods: Record<BudgetPeriod, string>;
  budgetKinds: Record<BudgetKind, string>;
}

const AMOUNT_FORMAT = "#,##0.00";
const STICKY_HEADER_ROWS = 1;
const TRANSACTION_COLUMN_WIDTHS = [12, 10, 20, 40, 14, 20];
const CATEGORY_COLUMN_WIDTHS = [24, 8, 10, 40, 14, 12, 14, 24];

const toColumns = (widths: number[]) => widths.map((width) => ({ width }));

const header = (value: string) => ({ value, fontWeight: "bold" as const });

const amountCell = (amount: { toString(): string }) => ({
  value: Number(amount.toString()),
  type: Number,
  format: AMOUNT_FORMAT,
});

function budgetCell(budget: ExportCategory["budget"]) {
  const amount = budget?.limits[0]?.amount;
  return amount ? amountCell(amount) : null;
}

function budgetPeriodCell(budget: ExportCategory["budget"], labels: WorkbookLabels) {
  if (!budget) return null;
  const period = budgetPeriodOf({ periodUnit: budget.periodUnit as BudgetPeriodUnit, periodCount: budget.periodCount });
  const kind = labels.budgetKinds[budget.kind as BudgetKind] ?? budget.kind;
  return { value: `${period ? labels.budgetPeriods[period] : budget.periodUnit} · ${kind}` };
}

export function buildWorkbook(
  data: { transactions: ExportTransaction[]; categories: ExportCategory[] },
  labels: WorkbookLabels,
  dateFormat: string,
): Sheet<Buffer>[] {
  const { columns } = labels;

  const transactions = getSheetData(data.transactions, [
    { header: header(columns.date), cell: (tx) => ({ value: tx.transactionDate, type: Date, format: dateFormat }) },
    { header: header(columns.type), cell: (tx) => ({ value: labels.types[tx.type as TransactionType] ?? tx.type }) },
    { header: header(columns.category), cell: (tx) => ({ value: tx.category.name }) },
    { header: header(columns.description), cell: (tx) => ({ value: tx.description ?? "" }) },
    { header: header(columns.amount), cell: (tx) => amountCell(tx.amount) },
    { header: header(columns.reference), cell: (tx) => ({ value: tx.reference ?? "" }) },
  ]);

  const categories = getSheetData(data.categories, [
    { header: header(columns.name), cell: (category) => ({ value: category.name }) },
    { header: header(columns.icon), cell: (category) => ({ value: category.icon }) },
    { header: header(columns.color), cell: (category) => ({ value: category.color }) },
    { header: header(columns.description), cell: (category) => ({ value: category.description ?? "" }) },
    {
      header: header(columns.transactions),
      cell: (category) => ({ value: category._count.transactions, type: Number }),
    },
    {
      header: header(columns.createdAt),
      cell: (category) => ({ value: category.createdAt, type: Date, format: dateFormat }),
    },
    { header: header(columns.budget), cell: (category) => budgetCell(category.budget) },
    { header: header(columns.budgetPeriod), cell: (category) => budgetPeriodCell(category.budget, labels) },
  ]);

  return [
    {
      sheet: labels.sheets.transactions,
      data: transactions,
      columns: toColumns(TRANSACTION_COLUMN_WIDTHS),
      stickyRowsCount: STICKY_HEADER_ROWS,
    },
    {
      sheet: labels.sheets.categories,
      data: categories,
      columns: toColumns(CATEGORY_COLUMN_WIDTHS),
      stickyRowsCount: STICKY_HEADER_ROWS,
    },
  ];
}
