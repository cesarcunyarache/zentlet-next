import { describe, expect, it, vi } from "vitest";
import type { ExportMonitor, SpreadsheetWriter } from "../../../domain/ports/account.ports";
import type { AccountExportRepository } from "../../../domain/repositories/account-export.repository";
import { ExportAccountUseCase } from "../export-account.use-case";

const transaction = {
  transactionDate: new Date("2026-09-20T00:00:00.000Z"),
  type: "expense",
  amount: { toString: () => "25.5" },
  description: "Farmacia",
  reference: null,
  category: { name: "Salud" },
};

function setup() {
  const repository: AccountExportRepository = {
    findData: vi.fn().mockResolvedValue({ transactions: [transaction], categories: [] }),
  };
  const writer: SpreadsheetWriter = { write: vi.fn().mockResolvedValue(new Uint8Array([80, 75])) };
  const monitor: ExportMonitor = { exported: vi.fn() };
  return { repository, writer, monitor, useCase: new ExportAccountUseCase(repository, writer, monitor) };
}

const headerOf = (writer: SpreadsheetWriter) => {
  const [workbook] = vi.mocked(writer.write).mock.calls[0];
  return JSON.stringify(workbook);
};

describe("ExportAccountUseCase", () => {
  it("arma el libro con los datos del usuario, lo escribe y lo nombra con la fecha", async () => {
    const { useCase, repository, monitor } = setup();

    const result = await useCase.execute("user-1", { locale: "es" }, new Date("2026-10-16T12:00:00Z"));

    expect(repository.findData).toHaveBeenCalledWith("user-1");
    expect(result).toEqual({ file: new Uint8Array([80, 75]), fileName: "zentlet-2026-10-16.xlsx" });
    expect(monitor.exported).toHaveBeenCalledWith("user-1", { transactions: 1, categories: 0 });
  });

  it("añade el símbolo de la moneda a la columna del monto", async () => {
    const { useCase, writer } = setup();

    await useCase.execute("user-1", { locale: "es", currency: "S/" });

    expect(headerOf(writer)).toContain("(S/)");
  });

  it("usa el formato de fecha del idioma", async () => {
    const { useCase, writer } = setup();

    await useCase.execute("user-1", { locale: "en" });

    expect(headerOf(writer)).toContain("mm/dd/yyyy");
  });
});
