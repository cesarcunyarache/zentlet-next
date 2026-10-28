import { describe, expect, it, vi } from "vitest";
import { MaterializeDueTransactionsUseCase } from "../materialize-due-transactions.use-case";
import { fakeRecurring, recurring } from "./fake-recurring";

function setup(today?: string) {
  const fakes = fakeRecurring(today);
  const useCase = new MaterializeDueTransactionsUseCase(
    fakes.repository,
    fakes.calendar,
    fakes.privateList,
    fakes.budget,
    fakes.monitor,
  );
  return { ...fakes, useCase };
}

const NOW = new Date("2026-10-06T17:00:00.000Z");

describe("MaterializeDueTransactionsUseCase", () => {
  it("crea las ocurrencias vencidas en la lista privada, avanza la regla y revisa el presupuesto", async () => {
    const { useCase, repository, budget } = setup("2026-10-06");
    vi.mocked(repository.findDueBy).mockResolvedValue([recurring()]);

    expect(await useCase.execute(NOW)).toEqual({ created: 1, failed: 0 });
    expect(repository.recordOccurrences).toHaveBeenCalledWith(
      "rec-1",
      [expect.objectContaining({ transactionDate: new Date("2026-10-06"), listId: "private-list", recurringTransactionId: "rec-1" })],
      new Date("2026-11-06"),
    );
    expect(budget.scheduleCheck).toHaveBeenCalledWith("user-1", "streaming");
  });

  it("espera al día del usuario: si en su zona todavía no toca, no crea nada", async () => {
    const { useCase, repository } = setup("2026-10-05");
    vi.mocked(repository.findDueBy).mockResolvedValue([recurring()]);

    expect(await useCase.execute(NOW)).toEqual({ created: 0, failed: 0 });
    expect(repository.recordOccurrences).not.toHaveBeenCalled();
  });

  it("un ingreso no revisa el presupuesto", async () => {
    const { useCase, repository, budget } = setup();
    vi.mocked(repository.findDueBy).mockResolvedValue([recurring({ type: "income" })]);

    await useCase.execute(NOW);

    expect(budget.scheduleCheck).not.toHaveBeenCalled();
  });

  it("si una regla falla, la cuenta y sigue con las demás", async () => {
    const { useCase, repository, monitor } = setup();
    vi.mocked(repository.findDueBy).mockResolvedValue([recurring({ id: "rec-broken" }), recurring({ id: "rec-ok" })]);
    vi.mocked(repository.recordOccurrences).mockRejectedValueOnce(new Error("db down"));

    expect(await useCase.execute(NOW)).toEqual({ created: 1, failed: 1 });
    expect(monitor.materializeFailed).toHaveBeenCalledWith("user-1", expect.any(Error));
  });
});
