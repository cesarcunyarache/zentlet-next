import { describe, expect, it, vi } from "vitest";
import { DeleteTransactionUseCase } from "../delete-transaction.use-case";
import { fakeRepository } from "./fake-transaction.repository";

describe("DeleteTransactionUseCase", () => {
  it("borra la transacción del usuario", async () => {
    const repository = fakeRepository();

    expect(await new DeleteTransactionUseCase(repository).execute("user-1", "tx-1")).toEqual({ ok: true });
    expect(repository.deleteOwned).toHaveBeenCalledWith("user-1", "tx-1");
  });

  it("si no existe o es ajena es not_found", async () => {
    const repository = fakeRepository({ deleteOwned: vi.fn().mockResolvedValue("not_found") });

    expect(await new DeleteTransactionUseCase(repository).execute("user-1", "tx-1")).toEqual({ error: "not_found" });
  });
});
