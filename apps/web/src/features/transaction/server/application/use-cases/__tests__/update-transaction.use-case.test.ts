import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BudgetMonitor } from "../../../domain/ports/transaction.ports";
import { UpdateTransactionUseCase } from "../update-transaction.use-case";
import { fakeRepository, stored } from "./fake-transaction.repository";

const USER = "user-1";

const expense = stored({
  id: "tx-1",
  userId: USER,
  description: "Farmacia",
  amount: 30,
  type: "expense",
  categoryId: "health",
  reference: null,
  transactionDate: new Date("2026-09-21"),
  listId: "private-list",
});

let budgetMonitor: BudgetMonitor;

beforeEach(() => {
  budgetMonitor = { scheduleCheck: vi.fn() };
});

describe("UpdateTransactionUseCase", () => {
  it("convierte la fecha y revisa el presupuesto si es un gasto", async () => {
    const repository = fakeRepository({ updateOwned: vi.fn().mockResolvedValue(expense) });

    const result = await new UpdateTransactionUseCase(repository, budgetMonitor).execute(USER, "tx-1", {
      amount: 30,
      transactionDate: "2026-09-21",
    });

    expect(result).toEqual({ transaction: expense });
    expect(repository.updateOwned).toHaveBeenCalledWith(USER, "tx-1", {
      amount: 30,
      transactionDate: new Date("2026-09-21"),
    });
    expect(budgetMonitor.scheduleCheck).toHaveBeenCalledWith(USER, "health");
  });

  it("sin fecha no la toca", async () => {
    const repository = fakeRepository({ updateOwned: vi.fn().mockResolvedValue(expense) });

    await new UpdateTransactionUseCase(repository, budgetMonitor).execute(USER, "tx-1", { amount: 30 });

    expect(repository.updateOwned).toHaveBeenCalledWith(USER, "tx-1", { amount: 30, transactionDate: undefined });
  });

  it("un ingreso no revisa el presupuesto", async () => {
    const income = { ...expense, type: "income" as const };
    const repository = fakeRepository({ updateOwned: vi.fn().mockResolvedValue(income) });

    await new UpdateTransactionUseCase(repository, budgetMonitor).execute(USER, "tx-1", { type: "income" });

    expect(budgetMonitor.scheduleCheck).not.toHaveBeenCalled();
  });

  it("una categoría ajena es category_not_found y no actualiza", async () => {
    const repository = fakeRepository({ categoryBelongsTo: vi.fn().mockResolvedValue(false) });

    const result = await new UpdateTransactionUseCase(repository, budgetMonitor).execute(USER, "tx-1", {
      categoryId: "otra",
    });

    expect(result).toEqual({ error: "category_not_found" });
    expect(repository.updateOwned).not.toHaveBeenCalled();
  });

  it("sin categoría en el cambio no la comprueba", async () => {
    const repository = fakeRepository({ updateOwned: vi.fn().mockResolvedValue(expense) });

    await new UpdateTransactionUseCase(repository, budgetMonitor).execute(USER, "tx-1", { amount: 30 });

    expect(repository.categoryBelongsTo).not.toHaveBeenCalled();
  });

  it.each(["not_found", "category_not_found"] as const)("si el repositorio responde %s lo devuelve", async (code) => {
    const repository = fakeRepository({ updateOwned: vi.fn().mockResolvedValue(code) });

    const result = await new UpdateTransactionUseCase(repository, budgetMonitor).execute(USER, "tx-1", { amount: 30 });

    expect(result).toEqual({ error: code });
    expect(budgetMonitor.scheduleCheck).not.toHaveBeenCalled();
  });
});
