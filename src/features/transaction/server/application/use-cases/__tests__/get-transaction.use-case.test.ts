import { describe, expect, it, vi } from "vitest";
import { GetTransactionUseCase } from "../get-transaction.use-case";
import { fakeRepository, stored } from "./fake-transaction.repository";

const transaction = stored({
  id: "tx-1",
  userId: "user-1",
  description: "Farmacia",
  amount: 25.5,
  type: "expense",
  categoryId: "health",
  reference: null,
  transactionDate: new Date("2026-09-20"),
  listId: "private-list",
});

describe("GetTransactionUseCase", () => {
  it("devuelve la transacción del usuario", async () => {
    const repository = fakeRepository({ findOwned: vi.fn().mockResolvedValue(transaction) });

    expect(await new GetTransactionUseCase(repository).execute("user-1", "tx-1")).toEqual({ transaction });
    expect(repository.findOwned).toHaveBeenCalledWith("user-1", "tx-1");
  });

  it("si no existe o es ajena es not_found", async () => {
    expect(await new GetTransactionUseCase(fakeRepository()).execute("user-1", "tx-1")).toEqual({ error: "not_found" });
  });
});
