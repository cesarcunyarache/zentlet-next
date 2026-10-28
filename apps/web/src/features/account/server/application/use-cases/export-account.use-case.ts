import type { Locale } from "@/i18n/routing";
import en from "@/locales/en/settings.json";
import es from "@/locales/es/settings.json";
import type { ExportQuery } from "../../../schemas/export.schema";
import { buildWorkbook, type WorkbookLabels } from "../../../lib/workbook";
import type { ExportMonitor, SpreadsheetWriter } from "../../domain/ports/account.ports";
import type { AccountExportRepository } from "../../domain/repositories/account-export.repository";

const LABELS: Record<Locale, WorkbookLabels> = { es: es.export, en: en.export };
const DATE_FORMATS: Record<Locale, string> = { es: "dd/mm/yyyy", en: "mm/dd/yyyy" };

function withCurrency(labels: WorkbookLabels, currency: string | undefined): WorkbookLabels {
  if (!currency) return labels;
  return { ...labels, columns: { ...labels.columns, amount: `${labels.columns.amount} (${currency})` } };
}

function exportFileName(now: Date) {
  const day = now.toISOString().slice(0, 10);
  return `zentlet-${day}.xlsx`;
}

export class ExportAccountUseCase {
  constructor(
    private readonly accountExportRepository: AccountExportRepository,
    private readonly spreadsheetWriter: SpreadsheetWriter,
    private readonly exportMonitor: ExportMonitor,
  ) {}

  async execute(userId: string, { locale, currency }: ExportQuery, now = new Date()) {
    const data = await this.accountExportRepository.findData(userId);

    const labels = withCurrency(LABELS[locale], currency);
    const workbook = buildWorkbook(data, labels, DATE_FORMATS[locale]);
    const file = await this.spreadsheetWriter.write(workbook);

    this.exportMonitor.exported(userId, {
      transactions: data.transactions.length,
      categories: data.categories.length,
    });

    return { file, fileName: exportFileName(now) };
  }
}
