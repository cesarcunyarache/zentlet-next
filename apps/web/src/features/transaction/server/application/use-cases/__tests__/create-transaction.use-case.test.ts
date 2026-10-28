import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateTransactionInput } from "../../../../schemas/transaction-api.schema";
import type { NewTransaction } from "../../../domain/entities/transaction.entity";
import type { BudgetMonitor, ListPlacement, RecurringSeries } from "../../../domain/ports/transaction.ports";
import { CreateTransactionUseCase } from "../create-transaction.use-case";
import { fakeRepository, stored } from "./fake-transaction.repository";

const USER = "user-1";
const PRIVATE_LIST = "private-list";
const TRIP_LIST = "0b6f7a1c-2d3e-4f50-8a9b-0c1d2e3f4a5b";

const input: CreateTransactionInput = {
  id: "7d3f1c2a-5b6e-4a8f-9c0d-1e2f3a4b5c6d",
  description: "Farmacia",
  amount: 25.5,
  type: "expense",
  categoryId: "health",
  transactionDate: "2026-09-20",
};

let budget: BudgetMonitor;
let recurring: RecurringSeries;
let lists: ListPlacement;

beforeEach(() => {
  budget = { scheduleCheck: vi.fn() };
  lists = { targetFor: vi.fn(async (_userId: string, requested: string | null) => requested ?? PRIVATE_LIST) };
  recurring = { start: vi.fn(async (draft: NewTransaction) => stored(draft, "series-1")) };
});

describe("CreateTransactionUseCase", () => {
  it("guarda en la lista pedida si se puede; si no, en la privada", async () => {
    const repository = fakeRepository();
    await new CreateTransactionUseCase(repository, recurring, budget, lists).execute(USER, { ...input, listId: TRIP_LIST });
    expect(lists.targetFor).toHaveBeenCalledWith(USER, TRIP_LIST);
    expect(repository.insert).toHaveBeenCalledWith(expect.objectContaining({ listId: TRIP_LIST }));
  });

  it("una serie recurrente va siempre a la privada", async () => {
    await new CreateTransactionUseCase(fakeRepository(), recurring, budget, lists).execute(USER, {
      ...input,
      listId: TRIP_LIST,
      recurrence: "MONTHLY",
    });
    expect(lists.targetFor).toHaveBeenCalledWith(USER, null);
    expect(recurring.start).toHaveBeenCalledWith(expect.objectContaining({ listId: PRIVATE_LIST }), "MONTHLY");
  });

  it("crea el gasto y programa la revisión de presupuesto", async () => {
    const repository = fakeRepository();
    const result = await new CreateTransactionUseCase(repository, recurring, budget, lists).execute(USER, input);

    expect(result).toMatchObject({ created: true, transaction: { id: input.id, userId: USER } });
    expect(budget.scheduleCheck).toHaveBeenCalledWith(USER, "health");
  });

  it("un ingreso no revisa el presupuesto", async () => {
    await new CreateTransactionUseCase(fakeRepository(), recurring, budget, lists).execute(USER, { ...input, type: "income" });

    expect(budget.scheduleCheck).not.toHaveBeenCalled();
  });

  it("con recurrencia delega en la serie y no inserta suelto", async () => {
    const repository = fakeRepository();
    const result = await new CreateTransactionUseCase(repository, recurring, budget, lists).execute(USER, {
      ...input,
      recurrence: "MONTHLY",
    });

    expect(recurring.start).toHaveBeenCalledWith(expect.objectContaining({ id: input.id }), "MONTHLY");
    expect(repository.insert).not.toHaveBeenCalled();
    expect(result).toMatchObject({ transaction: { recurringTransactionId: "series-1" } });
  });

  it("reenviar el mismo id devuelve la existente sin crear otra", async () => {
    const existing = stored({ ...input, userId: USER, reference: null, transactionDate: new Date(), listId: PRIVATE_LIST });
    const repository = fakeRepository({ findById: vi.fn().mockResolvedValue(existing) });

    const result = await new CreateTransactionUseCase(repository, recurring, budget, lists).execute(USER, input);

    expect(result).toEqual({ transaction: existing, created: false });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it("un id de otro usuario es id_taken", async () => {
    const foreign = stored({ ...input, userId: "user-2", reference: null, transactionDate: new Date(), listId: PRIVATE_LIST });
    const repository = fakeRepository({ findById: vi.fn().mockResolvedValue(foreign) });

    const result = await new CreateTransactionUseCase(repository, recurring, budget, lists).execute(USER, input);

    expect(result).toEqual({ error: "id_taken" });
  });

  it("una categoría ajena es category_not_found", async () => {
    const repository = fakeRepository({ categoryBelongsTo: vi.fn().mockResolvedValue(false) });

    const result = await new CreateTransactionUseCase(repository, recurring, budget, lists).execute(USER, input);

    expect(result).toEqual({ error: "category_not_found" });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it("si otra petición gana la carrera devuelve la ganadora", async () => {
    const winner = stored({ ...input, userId: USER, reference: null, transactionDate: new Date(), listId: PRIVATE_LIST });
    const repository = fakeRepository({
      insert: vi.fn().mockResolvedValue("id_taken"),
      findOwned: vi.fn().mockResolvedValue(winner),
    });

    const result = await new CreateTransactionUseCase(repository, recurring, budget, lists).execute(USER, input);

    expect(result).toEqual({ transaction: winner, created: false });
    expect(budget.scheduleCheck).not.toHaveBeenCalled();
  });
});
