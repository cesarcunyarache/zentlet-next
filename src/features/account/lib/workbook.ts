import { getSheetData, type Sheet } from "write-excel-file/node";
import type { TransactionType } from "@/features/transaction/types";

/*
 * Exportación de los datos del usuario: una hoja de movimientos y otra de
 * categorías. Todo lo que el usuario escribió viaja tal cual, como texto
 * (nunca como fórmula), con fechas y montos como valores nativos de Excel
 * para poder ordenar, filtrar y sumar.
 */

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
  };
  types: Record<TransactionType, string>;
}

const AMOUNT_FORMAT = "#,##0.00";

const header = (value: string) => ({ value, fontWeight: "bold" as const });

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
    { header: header(columns.amount), cell: (tx) => ({ value: Number(tx.amount.toString()), type: Number, format: AMOUNT_FORMAT }) },
    { header: header(columns.reference), cell: (tx) => ({ value: tx.reference ?? "" }) },
  ]);

  const categories = getSheetData(data.categories, [
    { header: header(columns.name), cell: (category) => ({ value: category.name }) },
    { header: header(columns.icon), cell: (category) => ({ value: category.icon }) },
    { header: header(columns.color), cell: (category) => ({ value: category.color }) },
    { header: header(columns.description), cell: (category) => ({ value: category.description ?? "" }) },
    { header: header(columns.transactions), cell: (category) => ({ value: category._count.transactions, type: Number }) },
    { header: header(columns.createdAt), cell: (category) => ({ value: category.createdAt, type: Date, format: dateFormat }) },
  ]);

  return [
    {
      sheet: labels.sheets.transactions,
      data: transactions,
      columns: [{ width: 12 }, { width: 10 }, { width: 20 }, { width: 40 }, { width: 14 }, { width: 20 }],
      stickyRowsCount: 1,
    },
    {
      sheet: labels.sheets.categories,
      data: categories,
      columns: [{ width: 24 }, { width: 8 }, { width: 10 }, { width: 40 }, { width: 14 }, { width: 12 }],
      stickyRowsCount: 1,
    },
  ];
}
