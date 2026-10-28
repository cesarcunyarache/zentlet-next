import type { buildWorkbook } from "../../../lib/workbook";

export type Workbook = ReturnType<typeof buildWorkbook>;

export interface SpreadsheetWriter {
  write(workbook: Workbook): Promise<Uint8Array<ArrayBuffer>>;
}

export interface ExportMonitor {
  exported(userId: string, counts: { transactions: number; categories: number }): void;
}
