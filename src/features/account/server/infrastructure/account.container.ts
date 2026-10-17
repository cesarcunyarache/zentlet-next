import { ExportAccountUseCase } from "../application/use-cases/export-account.use-case";
import { exportMonitor, spreadsheetWriter } from "./account.adapters";
import { PrismaAccountExportRepository } from "./persistence/prisma/prisma-account-export.repository";

const exports = new PrismaAccountExportRepository();

export const accountUseCases = {
  export: new ExportAccountUseCase(exports, spreadsheetWriter, exportMonitor),
};
