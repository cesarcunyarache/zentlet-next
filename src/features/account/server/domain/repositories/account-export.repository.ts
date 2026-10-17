import type { ExportCategory, ExportTransaction } from "../../../lib/workbook";

export interface AccountExportData {
  transactions: ExportTransaction[];
  categories: ExportCategory[];
}

export interface AccountExportRepository {
  findData(userId: string): Promise<AccountExportData>;
}
