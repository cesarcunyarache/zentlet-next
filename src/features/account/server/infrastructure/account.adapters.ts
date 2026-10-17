import writeXlsxFile from "write-excel-file/node";
import { logger } from "@/lib/observability/logger";
import type { ExportMonitor, SpreadsheetWriter } from "../domain/ports/account.ports";

export const spreadsheetWriter: SpreadsheetWriter = {
  async write(workbook) {
    const buffer = await writeXlsxFile(workbook).toBuffer();
    return new Uint8Array(buffer);
  },
};

export const exportMonitor: ExportMonitor = {
  exported: (userId, counts) => logger.info({ userId, ...counts }, "account.exported"),
};
