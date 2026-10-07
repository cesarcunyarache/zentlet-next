import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateTransactionInput } from "../../../schemas/transaction-api.schema";
import type { NewTransaction, Transaction } from "../../domain/transaction.entity";
import type { BudgetMonitor, RecurringSeries } from "../../domain/transaction.ports";
import type { TransactionRepository } from "../../domain/transaction.repository";
import { CreateTransactionUseCase } from "../create-transaction.usecase";

const USER = "user-1";

const input: CreateTransactionInput = {
  id: "7d3f1c2a-5b6e-4a8f-9c0d-1e2f3a4b5c6d",
  description: "Farmacia",
  amount: 25.5,
  type: "expense",
  categoryId: "health",
  transactionDate: "2026-09-20",
};

function stored(draft: NewTransaction, recurringTransactionId: string | null = null): Transaction {
  return { ...draft, recurringTransactionId, createdAt: new Date() };
}

function fakeRepository(overrides: Partial<TransactionRepository> = {}): TransactionRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findOwned: vi.fn().mockResolvedValue(null),
    findFeed: vi.fn(),
    summarize: vi.fn(),
    findExistingIds: vi.fn(),
    insert: vi.fn(async (draft: NewTransaction) => stored(draft)),
    updateOwned: vi.fn(),
    deleteOwned: vi.fn(),
    categoryBelongsTo: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

let budget: BudgetMonitor;
let recurring: RecurringSeries;

beforeEach(() => {
  budget = { scheduleCheck: vi.fn() };
  recurring = { start: vi.fn(async (draft: NewTransaction) => stored(draft, "series-1")) };
});

describe("CreateTransactionUseCase", () => {
  it("crea el gasto y programa la revisión de presupuesto", async () => {
    const repository = fakeRepository();
    const result = await new CreateTransactionUseCase(repository, recurring, budget).execute(USER, input);

    expect(result).toMatchObject({ created: true, transaction: { id: input.id, userId: USER } });
    expect(budget.scheduleCheck).toHaveBeenCalledWith(USER, "health");
  });

  it("un ingreso no revisa el presupuesto", async () => {
    await new CreateTransactionUseCase(fakeRepository(), recurring, budget).execute(USER, { ...input, type: "income" });

    expect(budget.scheduleCheck).not.toHaveBeenCalled();
  });

  it("con recurrencia delega en la serie y no inserta suelto", async () => {
    const repository = fakeRepository();
    const result = await new CreateTransactionUseCase(repository, recurring, budget).execute(USER, {
      ...input,
      recurrence: "MONTHLY",
    });

    expect(recurring.start).toHaveBeenCalledWith(expect.objectContaining({ id: input.id }), "MONTHLY");
    expect(repository.insert).not.toHaveBeenCalled();
    expect(result).toMatchObject({ transaction: { recurringTransactionId: "series-1" } });
  });

  it("reenviar el mismo id devuelve la existente sin crear otra", async () => {
    const existing = stored({ ...input, userId: USER, reference: null, transactionDate: new Date() });
    const repository = fakeRepository({ findById: vi.fn().mockResolvedValue(existing) });

    const result = await new CreateTransactionUseCase(repository, recurring, budget).execute(USER, input);

    expect(result).toEqual({ transaction: existing, created: false });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it("un id de otro usuario es id_taken", async () => {
    const foreign = stored({ ...input, userId: "user-2", reference: null, transactionDate: new Date() });
    const repository = fakeRepository({ findById: vi.fn().mockResolvedValue(foreign) });

    const result = await new CreateTransactionUseCase(repository, recurring, budget).execute(USER, input);

    expect(result).toEqual({ error: "id_taken" });
  });

  it("una categoría ajena es category_not_found", async () => {
    const repository = fakeRepository({ categoryBelongsTo: vi.fn().mockResolvedValue(false) });

    const result = await new CreateTransactionUseCase(repository, recurring, budget).execute(USER, input);

    expect(result).toEqual({ error: "category_not_found" });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it("si otra petición gana la carrera devuelve la ganadora", async () => {
    const winner = stored({ ...input, userId: USER, reference: null, transactionDate: new Date() });
    const repository = fakeRepository({
      insert: vi.fn().mockResolvedValue("id_taken"),
      findOwned: vi.fn().mockResolvedValue(winner),
    });

    const result = await new CreateTransactionUseCase(repository, recurring, budget).execute(USER, input);

    expect(result).toEqual({ transaction: winner, created: false });
    expect(budget.scheduleCheck).not.toHaveBeenCalled();
  });
});
