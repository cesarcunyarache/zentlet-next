import { describe, expect, it, vi } from "vitest";
import { GetRecurringTransactionUseCase } from "../get-recurring-transaction.use-case";
import { StopRecurringTransactionUseCase } from "../stop-recurring-transaction.use-case";
import { fakeRecurring, recurring } from "./fake-recurring";

describe("GetRecurringTransactionUseCase", () => {
  it("devuelve la regla del usuario", async () => {
    const { repository } = fakeRecurring();
    vi.mocked(repository.findOwned).mockResolvedValue(recurring());

    expect(await new GetRecurringTransactionUseCase(repository).execute("user-1", "rec-1")).toEqual({
      recurring: recurring(),
    });
    expect(repository.findOwned).toHaveBeenCalledWith("user-1", "rec-1");
  });

  it("una regla ajena o inexistente es not_found", async () => {
    const { repository } = fakeRecurring();
    expect(await new GetRecurringTransactionUseCase(repository).execute("user-1", "rec-1")).toEqual({
      error: "not_found",
    });
  });
});

describe("StopRecurringTransactionUseCase", () => {
  it("borra la regla del usuario", async () => {
    const { repository } = fakeRecurring();
    expect(await new StopRecurringTransactionUseCase(repository).execute("user-1", "rec-1")).toEqual({ ok: true });
  });

  it("una regla ajena o inexistente es not_found", async () => {
    const { repository } = fakeRecurring();
    vi.mocked(repository.deleteOwned).mockResolvedValue("not_found");
    expect(await new StopRecurringTransactionUseCase(repository).execute("user-1", "rec-1")).toEqual({
      error: "not_found",
    });
  });
});
