import { describe, expect, it, vi } from "vitest";
import type { TransactionSummaryQuery } from "../../../../schemas/transaction-api.schema";
import { SummarizeTransactionsUseCase } from "../summarize-transactions.use-case";
import { fakeRepository } from "./fake-transaction.repository";

describe("SummarizeTransactionsUseCase", () => {
  it("resume con los filtros y devuelve cuáles de los ids del cliente siguen existiendo", async () => {
    const summary = { expenseTotal: 120, incomeTotal: 0, count: 3, byCategory: [] };
    const repository = fakeRepository({
      summarize: vi.fn().mockResolvedValue(summary),
      findExistingIds: vi.fn().mockResolvedValue(["tx-1"]),
    });
    const query = { from: "2026-09-01", to: "2026-09-30", ids: ["tx-1", "tx-borrado"] } as TransactionSummaryQuery;

    const result = await new SummarizeTransactionsUseCase(repository).execute("user-1", query);

    expect(repository.summarize).toHaveBeenCalledWith("user-1", { from: "2026-09-01", to: "2026-09-30" });
    expect(repository.findExistingIds).toHaveBeenCalledWith("user-1", ["tx-1", "tx-borrado"]);
    expect(result).toEqual({ ...summary, presentIds: ["tx-1"] });
  });
});
