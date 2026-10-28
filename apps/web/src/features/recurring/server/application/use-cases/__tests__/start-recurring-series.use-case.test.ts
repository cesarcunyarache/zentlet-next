import { describe, expect, it } from "vitest";
import type { TransactionSeed } from "../../../domain/entities/recurring-transaction.entity";
import { StartRecurringSeriesUseCase } from "../start-recurring-series.use-case";
import { fakeRecurring } from "./fake-recurring";

const seed = (transactionDate: string): TransactionSeed => ({
  id: "tx-1",
  userId: "user-1",
  type: "expense",
  amount: 45,
  description: "Netflix",
  categoryId: "streaming",
  reference: null,
  transactionDate: new Date(transactionDate),
  listId: "private-list",
});

describe("StartRecurringSeriesUseCase", () => {
  it("agenda la siguiente ocurrencia un periodo después del primer movimiento", async () => {
    const { repository, calendar } = fakeRecurring("2026-10-06");

    await new StartRecurringSeriesUseCase(repository, calendar).execute(seed("2026-10-06"), "MONTHLY");

    expect(repository.startSeries).toHaveBeenCalledWith(seed("2026-10-06"), "MONTHLY", new Date("2026-11-06"));
  });

  it("con un primer movimiento atrasado no rellena periodos: agenda desde hoy en adelante", async () => {
    const { repository, calendar } = fakeRecurring("2026-10-06");

    await new StartRecurringSeriesUseCase(repository, calendar).execute(seed("2026-07-15"), "MONTHLY");

    expect(repository.startSeries).toHaveBeenCalledWith(seed("2026-07-15"), "MONTHLY", new Date("2026-10-15"));
  });
});
